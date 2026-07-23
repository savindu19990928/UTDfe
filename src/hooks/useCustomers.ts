import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CustomerRecord } from '../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getPhotoUrl } from '../utils/format';
import { getCached, setCache, isFresh, clearCache } from '../utils/apiCache';

interface UseCustomersOptions {
  search?: string;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
}

interface CustomerFormData {
  name: string;
  nic?: string;
  mobile_number: string;
  address: string;
  photo?: File | null;
}

interface UseCustomersReturn {
  customers: CustomerRecord[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  submitting: boolean;
  addCustomer: (data: CustomerFormData) => Promise<boolean>;
  updateCustomer: (
  id: string,
  data: Partial<CustomerFormData>)
  => Promise<boolean>;
  refetch: () => void;
}

function mapApiCustomer(raw: any): CustomerRecord {
  return {
    id: String(raw.id),
    name: raw.name || '',
    phone: raw.mobile_number || '',
    address: raw.address || '',
    nicNumber: raw.nic || undefined,
    photoUrl: getPhotoUrl(raw.photo),
    phoneVerified: raw.is_verified ?? false,
    isBanned: raw.is_banned ?? false,
    rentalCount: raw.rental_count ?? 0
  };
}

function buildFormData(data: Partial<CustomerFormData>): FormData {
  const fd = new FormData();
  if (data.name != null) fd.append('name', data.name);
  if (data.nic != null) fd.append('nic', data.nic);
  if (data.mobile_number != null) fd.append('mobile_number', data.mobile_number);
  if (data.address != null) fd.append('address', data.address);
  if (data.photo) fd.append('photo', data.photo);
  return fd;
}

const CACHE_KEY = 'customers:all';

export function useCustomers(
options?: UseCustomersOptions)
: UseCustomersReturn {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(options?.page || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const search = options?.search;
  const enabled = options?.enabled !== false;
  const pageSize = options?.pageSize || 20;
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Update current page when options.page changes
  useEffect(() => {
    if (options?.page) {
      setCurrentPage(options.page);
    }
  }, [options?.page]);

  const fetchCustomers = useCallback(async () => {
    if (!enabled) return;

    let url = `${API_URL}customers/`;
    const params = new URLSearchParams();
    params.append('page', currentPage.toString());
    params.append('page_size', pageSize.toString());

    if (debouncedSearch && debouncedSearch.trim()) {
      params.append('search', debouncedSearch.trim());
    }

    url += `?${params.toString()}`;

    const cacheKey = `customers:${url}`;

    const cached = getCached<{
      customers: CustomerRecord[];
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    }>(cacheKey, 5 * 60_000);
    if (cached) {
      setCustomers(cached.customers);
      setTotalCount(cached.totalCount);
      setTotalPages(cached.totalPages);
      setHasNext(cached.hasNext);
      setHasPrevious(cached.hasPrevious);
      setLoading(false);
      // Extended fresh window — skip network for 2 minutes after a successful fetch
      if (isFresh(cacheKey, 120_000)) return;
    } else {
      setLoading(true);
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    try {
      const res = await fetch(url, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`Failed to fetch customers (${res.status})`);
      const data = await res.json();

      let rawList: any[];
      let count: number;
      let next = false;
      let prev = false;
      let pages = 1;

      if (Array.isArray(data)) {
        rawList = data;
        count = data.length;
      } else {
        rawList = data.results || [];
        count = data.count ?? rawList.length;
        next = !!data.next;
        prev = !!data.previous;
        pages = data.total_pages || Math.ceil(count / pageSize) || 1;
      }

      const mapped = rawList.map(mapApiCustomer);
      setCustomers(mapped);
      setTotalCount(count);
      setTotalPages(pages);
      setHasNext(next);
      setHasPrevious(prev);
      setCache(cacheKey, {
        customers: mapped,
        totalCount: count,
        totalPages: pages,
        hasNext: next,
        hasPrevious: prev
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (!cached) {
        setError(err.message || 'Failed to load customers');
      }
      console.error('Customer fetch error:', err);
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, enabled, currentPage, pageSize]);

  useEffect(() => {
    if (enabled) {
      fetchCustomers();
    }
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchCustomers, enabled]);

  const addCustomer = useCallback(
    async (data: CustomerFormData): Promise<boolean> => {
      setSubmitting(true);
      try {
        const fd = buildFormData(data);
        const res = await fetch(`${API_URL}customers/`, {
          method: 'POST',
          headers: { ...getAuthHeaders() },
          body: fd
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          const msg = errData ?
          Object.values(errData).flat().join(', ') :
          `Failed (${res.status})`;
          throw new Error(msg);
        }
        // Clear cache and refetch to include the new customer
        clearCache('customers');
        await fetchCustomers();
        return true;
      } catch (err: any) {
        console.error('Add customer error:', err);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchCustomers]
  );

  const updateCustomer = useCallback(
    async (id: string, data: Partial<CustomerFormData>): Promise<boolean> => {
      setSubmitting(true);
      try {
        const fd = buildFormData(data);
        const res = await fetch(`${API_URL}customers/${id}/`, {
          method: 'PATCH',
          headers: { ...getAuthHeaders() },
          body: fd
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          const msg = errData ?
          Object.values(errData).flat().join(', ') :
          `Failed (${res.status})`;
          throw new Error(msg);
        }
        // Clear cache and refetch to reflect the update
        clearCache('customers');
        await fetchCustomers();
        return true;
      } catch (err: any) {
        console.error('Update customer error:', err);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchCustomers]
  );

  return {
    customers,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    hasNext,
    hasPrevious,
    submitting,
    addCustomer,
    updateCustomer,
    refetch: () => {
      clearCache('customers');
      fetchCustomers();
    }
  };
}