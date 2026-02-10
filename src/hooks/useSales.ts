import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSales = useCallback(async () => {
    if (!enabled) return;

    let baseUrl = `${API_URL}sales/`;
    if (debouncedSearch && debouncedSearch.trim()) {
      baseUrl += `?bill_number=${encodeURIComponent(debouncedSearch.trim())}`;
    }

    const cacheKey = `sales:${baseUrl}`;

    // Stale-while-revalidate
    const cached = getCached<{sales: Bill[];totalCount: number;}>(
      cacheKey,
      60_000
    );
    if (cached) {
      setSales(cached.sales);
      setTotalCount(cached.totalCount);
      setLoading(false);
      if (isFresh(cacheKey, 20_000)) return;
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      };
      const firstRes = await fetch(baseUrl, { headers });
      if (!firstRes.ok)
      throw new Error(`Failed to fetch sales (${firstRes.status})`);
      const firstData = await firstRes.json();

      let allResults: any[];

      if (Array.isArray(firstData)) {
        allResults = firstData;
      } else {
        allResults = [...(firstData.results || [])];
        const total = firstData.count ?? allResults.length;

        // Fetch remaining pages in PARALLEL
        if (firstData.next) {
          const pageSize = firstData.results?.length || 20;
          const totalPages = Math.ceil(total / pageSize);
          const pageUrls: string[] = [];
          for (let p = 2; p <= totalPages; p++) {
            const separator = baseUrl.includes('?') ? '&' : '?';
            pageUrls.push(`${baseUrl}${separator}page=${p}`);
          }

          if (pageUrls.length > 0) {
            const pageResults = await Promise.all(
              pageUrls.map(async (url) => {
                try {
                  const res = await fetch(url, { headers });
                  if (!res.ok) return [];
                  const data = await res.json();
                  return data.results || [];
                } catch {
                  return [];
                }
              })
            );
            for (const results of pageResults) {
              allResults = [...allResults, ...results];
            }
          }
        }

        setTotalCount(total);
      }

      const mapped = allResults.map(mapApiSale);
      setSales(mapped);
      setTotalCount(allResults.length);
      setCache(cacheKey, { sales: mapped, totalCount: allResults.length });
    } catch (err: any) {
      if (!cached) {
        setError(err.message || 'Failed to load sales');
      }
      console.error('Sales fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, enabled]);

  useEffect(() => {
    if (enabled) {
      fetchSales();
    }
  }, [fetchSales, enabled]);

  return {
    sales,
    loading,
    error,
    totalCount,
    refetch: fetchSales
  };
}