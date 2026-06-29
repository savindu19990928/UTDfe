import { useState, useEffect, useCallback, useRef } from 'react';
import { Bill, CartItem, Customer } from '../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getCached, setCache, isFresh } from '../utils/apiCache';

interface UseSalesOptions {
  search?: string;
  enabled?: boolean;
}

interface UseSalesReturn {
  sales: Bill[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => void;
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

  const search = options?.search;
  const enabled = options?.enabled !== false;
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
    if (debouncedSearch && debouncedSearch.trim()) {
      let searchVal = debouncedSearch.trim();
      if (/^\d+$/.test(searchVal)) {
        searchVal = `SALE-${searchVal}`;
      }
      baseUrl += `?bill_number=${encodeURIComponent(searchVal)}`;
    }

    const cacheKey = `sales:${baseUrl}`;

    const cached = getCached<{sales: Bill[];totalCount: number;}>(
      cacheKey,
      5 * 60_000
    );
    if (cached) {
      setSales(cached.sales);
      setTotalCount(cached.totalCount);
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

      if (Array.isArray(data)) {
        allResults = data;
      } else {
        allResults = [...(data.results || [])];
      }

      const mapped = allResults.map(mapApiSale);
      setSales(mapped);
      setTotalCount(allResults.length);
      setCache(cacheKey, { sales: mapped, totalCount: allResults.length });
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
  }, [debouncedSearch, enabled]);

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
    refetch: fetchSales
  };
}