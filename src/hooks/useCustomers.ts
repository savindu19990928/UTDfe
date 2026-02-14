import { useState, useEffect, useCallback, useMemo } from 'react';
import { CustomerRecord } from '../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getPhotoUrl } from '../utils/format';
import { getCached, setCache, isFresh, clearCache } from '../utils/apiCache';

interface UseCustomersOptions {
  search?: string;
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
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const search = options?.search;

  // Fetch ALL customers once — no search param to API
  const fetchCustomers = useCallback(async () => {
    const url = `${API_URL}customers/`;

    // Stale-while-revalidate from cache
    const cached = getCached<CustomerRecord[]>(CACHE_KEY, 5 * 60_000);
    if (cached) {
      setAllCustomers(cached);
      setLoading(false);
      // If still fresh, skip network entirely
      if (isFresh(CACHE_KEY, 60_000)) return;
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const res = await fetch(url, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`Failed to fetch customers (${res.status})`);
      const data = await res.json();

      const rawList: any[] = Array.isArray(data) ? data : data.results || [];
      const mapped = rawList.map(mapApiCustomer);
      setAllCustomers(mapped);
      setCache(CACHE_KEY, mapped);
    } catch (err: any) {
      if (!cached) {
        setError(err.message || 'Failed to load customers');
      }
      console.error('Customer fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Filter locally based on search — instant, no API call
  const customers = useMemo(() => {
    if (!search || !search.trim()) return allCustomers;
    const q = search.toLowerCase().trim();
    return allCustomers.filter(
      (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.nicNumber && c.nicNumber.toLowerCase().includes(q) ||
      c.address && c.address.toLowerCase().includes(q)
    );
  }, [allCustomers, search]);

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
    totalCount: allCustomers.length,
    submitting,
    addCustomer,
    updateCustomer,
    refetch: () => {
      clearCache('customers');
      fetchCustomers();
    }
  };
}