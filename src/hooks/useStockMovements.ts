import { useState, useCallback, useEffect, useRef } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { clearCache } from '../utils/apiCache';

export type MovementType = 'in' | 'out';

export interface StockMovement {
  id: number;
  product: number;
  product_name: string;
  product_item_number?: string;
  product_unit?: string;
  product_category_name?: string;
  movement_type: MovementType;
  quantity: string | number;
  reference?: string;
  notes?: string;
  created_by?: number;
  created_by_name?: string;
  current_stock?: number;
  created_at: string;
}

export interface StockMovementSummary {
  total_movements: number;
  total_stock_in: number;
  total_stock_out: number;
  net_movement: number;
  total_stock_in_formatted?: string;
  total_stock_out_formatted?: string;
  net_movement_formatted?: string;
}

export interface ProductStockMovementsData {
  count: number;
  product_id: number;
  product_name: string;
  item_number?: string;
  unit?: string;
  category_name?: string;
  current_stock: number;
  movements?: StockMovement[];
  results?: StockMovement[];
}

export interface StockMovementFilters {
  product?: number | string;
  movementType?: '' | MovementType;
  startDate?: string;
  endDate?: string;
  search?: string;
  ordering?: string;
  page?: number;
}

export interface CreateStockMovementPayload {
  product: number;
  movement_type: MovementType;
  quantity: number;
  reference?: string;
  notes?: string;
}

export interface UpdateStockMovementPayload {
  product?: number;
  movement_type?: MovementType;
  quantity?: number;
  reference?: string;
  notes?: string;
}

const PAGE_SIZE = 20;

function extractErrorMessage(errData: any, fallback: string): string {
  if (!errData) return fallback;
  if (typeof errData === 'string') return errData;
  if (errData.detail) return String(errData.detail);
  if (errData.error) return String(errData.error);
  if (errData.message) return String(errData.message);
  if (typeof errData === 'object') {
    const parts = Object.entries(errData).map(([k, v]) => {
      const val = Array.isArray(v) ? v.join(', ') : String(v);
      return k === 'non_field_errors' ? val : `${k}: ${val}`;
    });
    if (parts.length > 0) return parts.join(' | ');
  }
  return fallback;
}

export function useStockMovements(filters: StockMovementFilters) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [summary, setSummary] = useState<StockMovementSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [productDetail, setProductDetail] =
    useState<ProductStockMovementsData | null>(null);
  const [productDetailLoading, setProductDetailLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchMovements = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.page && filters.page > 1) {
        params.set('page', String(filters.page));
      }
      if (filters.product) {
        params.set('product', String(filters.product));
      }
      if (filters.movementType) {
        params.set('movement_type', filters.movementType);
      }
      if (filters.startDate) {
        params.set('start_date', filters.startDate);
      }
      if (filters.endDate) {
        params.set('end_date', filters.endDate);
      }
      if (filters.search && filters.search.trim()) {
        params.set('search', filters.search.trim());
      }
      if (filters.ordering) {
        params.set('ordering', filters.ordering);
      }

      const qs = params.toString();
      const res = await fetch(
        `${API_URL}stock-movements/${qs ? `?${qs}` : ''}`,
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          extractErrorMessage(
            errData,
            `Failed to load stock movements (${res.status})`
          )
        );
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setMovements(data);
        setTotalCount(data.length);
        setTotalPages(1);
      } else {
        const results: StockMovement[] = Array.isArray(data.results)
          ? data.results
          : [];
        const count = typeof data.count === 'number' ? data.count : results.length;
        const pages =
          typeof data.total_pages === 'number'
            ? Math.max(1, data.total_pages)
            : Math.max(1, Math.ceil(count / PAGE_SIZE));
        setMovements(results);
        setTotalCount(count);
        setTotalPages(pages);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to load stock movements');
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [
    filters.page,
    filters.product,
    filters.movementType,
    filters.startDate,
    filters.endDate,
    filters.search,
    filters.ordering
  ]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.product) {
        params.set('product_id', String(filters.product));
      }
      if (filters.startDate) {
        params.set('start_date', filters.startDate);
      }
      if (filters.endDate) {
        params.set('end_date', filters.endDate);
      }
      const qs = params.toString();
      const res = await fetch(
        `${API_URL}stock-movements/summary/${qs ? `?${qs}` : ''}`,
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.warn('Failed to fetch stock movement summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [filters.product, filters.startDate, filters.endDate]);

  const fetchByProduct = useCallback(async (productId?: number | string) => {
    if (!productId) {
      setProductDetail(null);
      return null;
    }
    setProductDetailLoading(true);
    try {
      const res = await fetch(
        `${API_URL}stock-movements/by_product/?product_id=${encodeURIComponent(
          String(productId)
        )}`,
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );
      if (!res.ok) {
        setProductDetail(null);
        return null;
      }
      const data: ProductStockMovementsData = await res.json();
      setProductDetail(data);
      return data;
    } catch {
      setProductDetail(null);
      return null;
    } finally {
      setProductDetailLoading(false);
    }
  }, []);

  const fetchSingleMovement = useCallback(
    async (id: number): Promise<StockMovement | null> => {
      try {
        const res = await fetch(`${API_URL}stock-movements/${id}/`, {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            extractErrorMessage(
              errData,
              `Failed to load stock movement #${id} (${res.status})`
            )
          );
        }
        return await res.json();
      } catch (err: any) {
        setActionError(err.message || 'Failed to load stock movement');
        return null;
      }
    },
    []
  );

  useEffect(() => {
    fetchMovements();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchMovements]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (filters.product) {
      fetchByProduct(filters.product);
    } else {
      setProductDetail(null);
    }
  }, [filters.product, fetchByProduct]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchMovements(),
      fetchSummary(),
      filters.product ? fetchByProduct(filters.product) : Promise.resolve(null)
    ]);
  }, [fetchMovements, fetchSummary, fetchByProduct, filters.product]);

  const createMovement = useCallback(
    async (payload: CreateStockMovementPayload): Promise<StockMovement> => {
      setSubmitting(true);
      setActionError(null);
      try {
        const res = await fetch(`${API_URL}stock-movements/`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            extractErrorMessage(
              errData,
              `Failed to create stock movement (${res.status})`
            )
          );
        }
        const created: StockMovement = await res.json();
        clearCache('products:');
        await refreshAll();
        return created;
      } catch (err: any) {
        setActionError(err.message || 'Failed to create stock movement');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [refreshAll]
  );

  const updateMovement = useCallback(
    async (
      id: number,
      payload: UpdateStockMovementPayload
    ): Promise<StockMovement> => {
      setSubmitting(true);
      setActionError(null);
      try {
        const res = await fetch(`${API_URL}stock-movements/${id}/`, {
          method: 'PATCH',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            extractErrorMessage(
              errData,
              `Failed to update stock movement (${res.status})`
            )
          );
        }
        const updated: StockMovement = await res.json();
        clearCache('products:');
        await refreshAll();
        return updated;
      } catch (err: any) {
        setActionError(err.message || 'Failed to update stock movement');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [refreshAll]
  );

  const deleteMovement = useCallback(
    async (id: number): Promise<void> => {
      setSubmitting(true);
      setActionError(null);
      try {
        const res = await fetch(`${API_URL}stock-movements/${id}/`, {
          method: 'DELETE',
          headers: {
            ...getAuthHeaders()
          }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            extractErrorMessage(
              errData,
              `Failed to delete stock movement (${res.status})`
            )
          );
        }
        clearCache('products:');
        await refreshAll();
      } catch (err: any) {
        setActionError(err.message || 'Failed to delete stock movement');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [refreshAll]
  );

  return {
    movements,
    loading,
    error,
    totalCount,
    totalPages,
    summary,
    summaryLoading,
    productDetail,
    productDetailLoading,
    submitting,
    actionError,
    setActionError,
    refetch: refreshAll,
    fetchSingleMovement,
    createMovement,
    updateMovement,
    deleteMovement
  };
}
