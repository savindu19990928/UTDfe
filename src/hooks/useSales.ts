import { useState, useEffect, useCallback, useRef } from 'react';
import { Bill, CartItem, Customer } from '../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getCached, setCache, isFresh } from '../utils/apiCache';

interface UseSalesOptions {
  search?: string;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
}

interface UseSalesReturn {
  sales: Bill[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  refetch: () => void;
  setPage: (page: number) => void;
}

function mapSaleItem(raw: any): CartItem {
  return {
    product: {
      id: String(raw.product || ''),
      name: raw.product_name || '',
      category: 'Heavy Equipment' as any,
      listingType: 'sale',
      salePrice: parseFloat(raw.unit_price ?? 0),
      rentPricePerDay: null,
      stock: 0,
      itemCode: raw.product_item_number || undefined
    },
    quantity: raw.quantity || 1,
    type: 'sale',
    apiItemId: raw.id != null ? Number(raw.id) : undefined,
    returnedQuantity: raw.returned_quantity ?? 0
  };
}

function mapApiSale(raw: any): Bill {
  const items: CartItem[] = (raw.items || []).map(mapSaleItem);
  const totalAmount = parseFloat(raw.total_amount ?? 0);
  const discount = parseFloat(raw.discount ?? 0);
  const finalAmount = parseFloat(raw.final_amount ?? 0);

  const customer: Customer = {
    name: raw.customer_name || 'Walk-in Customer',
    phone: '-',
    address: '-'
  };

  return {
    id: raw.bill_number || String(raw.id),
    apiId: raw.id != null ? Number(raw.id) : undefined,
    date: raw.created_at ? new Date(raw.created_at).toLocaleDateString() : '',
    dueDate: '',
    customer,
    items,
    subtotal: totalAmount,
    discount,
    discountAmount: totalAmount * (discount / 100),
    tax: 0,
    total: finalAmount,
    type: 'invoice',
    paymentMethod: raw.payment_method as any || 'cash'
  };
}

export function useSales(options?: UseSalesOptions): UseSalesReturn {
  const [sales, setSales] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const fetchSales = useCallback(async () => {
    if (!enabled) return;

    let baseUrl = `${API_URL}sales/`;
    const params = new URLSearchParams();
    params.append('page', currentPage.toString());
    params.append('page_size', pageSize.toString());

    if (debouncedSearch && debouncedSearch.trim()) {
      let searchVal = debouncedSearch.trim();
      if (/^\d+$/.test(searchVal)) {
        searchVal = `SALE-${searchVal}`;
      }
      params.append('bill_number', searchVal);
    }

    baseUrl += `?${params.toString()}`;

    const cacheKey = `sales:${baseUrl}`;

    const cached = getCached<{sales: Bill[];totalCount: number;totalPages: number;hasNext: boolean;hasPrevious: boolean;}>(
      cacheKey,
      5 * 60_000
    );
    if (cached) {
      setSales(cached.sales);
      setTotalCount(cached.totalCount);
      setTotalPages(cached.totalPages);
      setHasNext(cached.hasNext);
      setHasPrevious(cached.hasPrevious);
      setLoading(false);
      if (isFresh(cacheKey, 60_000)) return;
    } else {
      setLoading(true);
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    try {
      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      };
      const res = await fetch(baseUrl, { headers, signal: controller.signal });
      if (!res.ok) throw new Error(`Failed to fetch sales (${res.status})`);
      const data = await res.json();

      let allResults: any[];
      let count = 0;
      let next = false;
      let prev = false;
      let pages = 1;

      if (Array.isArray(data)) {
        allResults = data;
        count = data.length;
      } else {
        allResults = [...(data.results || [])];
        count = data.count || data.total_sale_bill_count || allResults.length;
        next = !!data.next;
        prev = !!data.previous;
        pages = data.total_pages || Math.ceil(count / pageSize) || 1;
      }

      const mapped = allResults.map(mapApiSale);
      setSales(mapped);
      setTotalCount(count);
      setTotalPages(pages);
      setHasNext(next);
      setHasPrevious(prev);
      setCache(cacheKey, {
        sales: mapped,
        totalCount: count,
        totalPages: pages,
        hasNext: next,
        hasPrevious: prev
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (!cached) {
        setError(err.message || 'Failed to load sales');
      }
      console.error('Sales fetch error:', err);
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, enabled, currentPage, pageSize]);

  useEffect(() => {
    if (enabled) {
      fetchSales();
    }
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchSales, enabled]);

  return {
    sales,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    hasNext,
    hasPrevious,
    refetch: fetchSales,
    setPage: setCurrentPage
  };
}