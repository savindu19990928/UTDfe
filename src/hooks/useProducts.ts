import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Product } from '../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getCached, setCache, isFresh, clearCache } from '../utils/apiCache';

interface UseProductsOptions {
  categoryType?: 'sell' | 'rent';
  categoryId?: number | string;
  page?: number;
  search?: string;
  enabled?: boolean;
  includeDeactivated?: boolean;
  withMachines?: boolean;
}

interface UseProductsReturn {
  products: Product[];
  saleProducts: Product[];
  rentProducts: Product[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  refetch: () => void;
}

const PER_PAGE = 20;

function mapApiProduct(raw: any): Product {
  const categoryType =
  raw.category?.category_type || raw.category_type || raw.listingType;
  const listingType: 'sale' | 'rent' =
  categoryType === 'sell' ? 'sale' : categoryType === 'rent' ? 'rent' : 'sale';
  const price = parseFloat(raw.price ?? 0);

  return {
    id: String(raw.id),
    name: raw.name || raw.product_name || '',
    category:
    raw.category?.name || raw.category_name || raw.category || 'Hand Tools',
    categoryId: raw.category?.id || raw.category_id || undefined,
    listingType,
    salePrice:
    listingType === 'sale' ?
    price || parseFloat(raw.sale_price ?? raw.salePrice ?? 0) :
    parseFloat(raw.sale_price ?? raw.salePrice ?? 0),
    rentPricePerDay:
    listingType === 'rent' ?
    price ||
    parseFloat(raw.rent_price_per_day ?? raw.rentPricePerDay ?? 0) :
    raw.rent_price_per_day != null ?
    parseFloat(raw.rent_price_per_day) :
    raw.rentPricePerDay ?? null,
    stock: parseInt(raw.current_stock ?? raw.stock ?? raw.quantity ?? 0, 10),
    itemCode: raw.item_number || raw.item_code || raw.itemCode || undefined,
    barcode: raw.barcode || undefined,
    isStockTracked: raw.is_stock_tracked ?? true,
    isActive: raw.is_active ?? true,
    machines: raw.machines
  };
}

// Build cache key from params
function buildCacheKey(params: URLSearchParams): string {
  const sorted = Array.from(params.entries()).sort(([a], [b]) =>
  a.localeCompare(b)
  );
  return `products:${sorted.map(([k, v]) => `${k}=${v}`).join('&') || 'all'}`;
}

// Build API URL with query params
function buildApiUrl(options?: UseProductsOptions): {
  url: string;
  cacheKey: string;
} {
  const params = new URLSearchParams();
  if (options?.categoryId) {
    params.set('category', String(options.categoryId));
  } else if (options?.categoryType) {
    params.set('category__category_type', options.categoryType);
  }
  if (options?.page != null) {
    params.set('page', String(options.page));
  }
  if (options?.search) {
    params.set('search', options.search);
  }
  if (options?.includeDeactivated) {
    params.set('include_deactivated', 'true');
  }
  const qs = params.toString();
  const endpoint = options?.withMachines ? 'products/with_machines/' : 'products/';
  return {
    url: `${API_URL}${endpoint}${qs ? `?${qs}` : ''}`,
    cacheKey: buildCacheKey(params) + (options?.withMachines ? '&withMachines=true' : '')
  };
}

export function useProducts(options?: UseProductsOptions): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [apiTotalPages, setApiTotalPages] = useState<number | null>(null);

  const categoryType = options?.categoryType;
  const categoryId = options?.categoryId;
  const page = options?.page;
  const search = options?.search;
  const enabled = options?.enabled !== false;

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const { url, cacheKey } = useMemo(
    () => buildApiUrl(options),
    [categoryType, categoryId, page, search]
  );

  const fetchProducts = useCallback(async () => {
    if (!enabled) return;

    const currentRequestId = ++requestIdRef.current;

    // If cache is fresh, use it and skip network entirely
    const cached = getCached<{
      products: Product[];
      totalCount: number;
      totalPages: number | null;
    }>(cacheKey);
    if (cached && isFresh(cacheKey)) {
      setProducts(cached.products);
      setTotalCount(cached.totalCount);
      setApiTotalPages(cached.totalPages ?? null);
      setLoading(false);
      return;
    }

    if (cached) {
      setProducts(cached.products);
      setTotalCount(cached.totalCount);
      setApiTotalPages(cached.totalPages ?? null);
    }

    setLoading(true);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    try {
      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      };

      const res = await fetch(url, { headers, signal: controller.signal });

      if (currentRequestId !== requestIdRef.current) return;

      if (!res.ok) throw new Error(`Failed to fetch products (${res.status})`);
      const data = await res.json();

      let allResults: any[];
      let count: number;
      let pagesFromApi: number | null = null;

      if (Array.isArray(data)) {
        allResults = data;
        count = data.length;
      } else {
        allResults = [...(data.results || [])];
        count = data.count ?? allResults.length;
        if (typeof data.total_pages === 'number') {
          pagesFromApi = data.total_pages;
        }
      }

      if (currentRequestId !== requestIdRef.current) return;

      const mapped = allResults.map(mapApiProduct);
      const filtered = options?.includeDeactivated ? mapped : mapped.filter((p) => p.isActive !== false);

      setProducts(filtered);
      setTotalCount(count);
      setApiTotalPages(pagesFromApi);
      setCache(cacheKey, {
        products: filtered,
        totalCount: count,
        totalPages: pagesFromApi
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (currentRequestId === requestIdRef.current) {
        if (!cached) {
          setError(err.message || 'Failed to load products');
        }
        console.error('Product fetch error:', err);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, url, cacheKey, page]);

  useEffect(() => {
    if (enabled) {
      fetchProducts();
    }
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchProducts, enabled]);

  // Derived lists
  const saleProducts = useMemo(
    () => products.filter((p) => p.listingType === 'sale' && p.isActive !== false),
    [products]
  );
  const rentProducts = useMemo(
    () => products.filter((p) => p.listingType === 'rent' && p.isActive !== false),
    [products]
  );

  // Prefer API-provided total_pages; fall back to count / PER_PAGE
  const totalPages =
  apiTotalPages != null ?
  Math.max(1, apiTotalPages) :
  Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const currentPage = page ?? 1;

  return {
    products,
    saleProducts,
    rentProducts,
    loading,
    error,
    totalCount,
    totalPages,
    currentPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    refetch: () => {
      clearCache(cacheKey);
      fetchProducts();
    }
  };
}