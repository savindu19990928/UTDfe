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
    barcode: raw.barcode || undefined
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
  const qs = params.toString();
  return {
    url: `${API_URL}products/${qs ? `?${qs}` : ''}`,
    cacheKey: buildCacheKey(params)
  };
}

export function useProducts(options?: UseProductsOptions): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const categoryType = options?.categoryType;
  const categoryId = options?.categoryId;
  const page = options?.page; // undefined means fetch all pages
  const search = options?.search;
  const enabled = options?.enabled !== false;

  // Track current request to avoid stale responses
  const requestIdRef = useRef(0);

  const { url, cacheKey } = useMemo(
    () => buildApiUrl(options),
    [categoryType, categoryId, page, search]
  );

  const fetchProducts = useCallback(async () => {
    if (!enabled) return;

    const currentRequestId = ++requestIdRef.current;

    // Stale-while-revalidate from cache
    const cached = getCached<{products: Product[];totalCount: number;}>(
      cacheKey,
      5 * 60_000
    );
    if (cached) {
      setProducts(cached.products);
      setTotalCount(cached.totalCount);
      setLoading(false);
      if (isFresh(cacheKey, 60_000)) return;
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      };

      const res = await fetch(url, { headers });

      // Abort if a newer request has been made
      if (currentRequestId !== requestIdRef.current) return;

      if (!res.ok) throw new Error(`Failed to fetch products (${res.status})`);
      const data = await res.json();

      let allResults: any[];
      let count: number;

      if (Array.isArray(data)) {
        allResults = data;
        count = data.length;
      } else {
        allResults = [...(data.results || [])];
        count = data.count ?? allResults.length;

        // If no specific page requested, fetch ALL remaining pages
        if (page == null && data.next) {
          const pageSize = data.results?.length || 20;
          const totalPages = Math.ceil(count / pageSize);
          const pageUrls: string[] = [];
          for (let p = 2; p <= totalPages; p++) {
            const separator = url.includes('?') ? '&' : '?';
            pageUrls.push(`${url}${separator}page=${p}`);
          }

          if (pageUrls.length > 0) {
            const pageResults = await Promise.all(
              pageUrls.map(async (pageUrl) => {
                try {
                  const r = await fetch(pageUrl, { headers });
                  if (!r.ok) return [];
                  const d = await r.json();
                  return d.results || [];
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
      }

      if (currentRequestId !== requestIdRef.current) return;

      const mapped = allResults.map(mapApiProduct);

      setProducts(mapped);
      setTotalCount(count);
      setCache(cacheKey, { products: mapped, totalCount: count });
    } catch (err: any) {
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
  }, [fetchProducts, enabled]);

  // Derived convenience lists (only meaningful when no filters applied)
  const saleProducts = useMemo(
    () => products.filter((p) => p.listingType === 'sale'),
    [products]
  );
  const rentProducts = useMemo(
    () => products.filter((p) => p.listingType === 'rent'),
    [products]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
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