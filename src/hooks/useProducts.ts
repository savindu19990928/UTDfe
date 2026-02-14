import { useState, useEffect, useCallback, useMemo } from 'react';
import { Product } from '../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getCached, setCache, isFresh, clearCache } from '../utils/apiCache';

interface UseProductsOptions {
  categoryType?: 'sell' | 'rent';
  categoryId?: number | string;
  page?: number;
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
const CACHE_KEY = 'products:all';

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

export function useProducts(options?: UseProductsOptions): UseProductsReturn {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryType = options?.categoryType;
  const categoryId = options?.categoryId;
  const page = options?.page;
  const enabled = options?.enabled !== false; // default true

  // Fetch ALL products once — no filters sent to API
  const fetchAllProducts = useCallback(async () => {
    if (!enabled) return;

    const url = `${API_URL}products/`;

    // Stale-while-revalidate from cache
    const cached = getCached<Product[]>(CACHE_KEY, 5 * 60_000);
    if (cached) {
      setAllProducts(cached);
      setLoading(false);
      // If still fresh, skip network entirely
      if (isFresh(CACHE_KEY, 60_000)) return;
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      };

      // Fetch first page
      const firstRes = await fetch(url, { headers });
      if (!firstRes.ok)
      throw new Error(`Failed to fetch products (${firstRes.status})`);
      const firstData = await firstRes.json();

      let allResults: any[];

      if (Array.isArray(firstData)) {
        allResults = firstData;
      } else {
        allResults = [...(firstData.results || [])];
        const total = firstData.count ?? allResults.length;

        // Fetch remaining pages in PARALLEL if paginated
        if (firstData.next) {
          const pageSize = firstData.results?.length || 20;
          const totalPages = Math.ceil(total / pageSize);
          const pageUrls: string[] = [];
          for (let p = 2; p <= totalPages; p++) {
            pageUrls.push(`${url}?page=${p}`);
          }

          if (pageUrls.length > 0) {
            const pageResults = await Promise.all(
              pageUrls.map(async (pageUrl) => {
                try {
                  const res = await fetch(pageUrl, { headers });
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
      }

      const mapped = allResults.map(mapApiProduct);
      setAllProducts(mapped);
      setCache(CACHE_KEY, mapped);
    } catch (err: any) {
      if (!cached) {
        setError(err.message || 'Failed to load products');
      }
      console.error('Product fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchAllProducts();
    }
  }, [fetchAllProducts, enabled]);

  // Filter locally based on categoryType and categoryId — instant, no API call
  const filteredProducts = useMemo(() => {
    let result = allProducts;
    if (categoryId) {
      result = result.filter(
        (p) =>
        p.categoryId != null && String(p.categoryId) === String(categoryId)
      );
    } else if (categoryType) {
      const targetType = categoryType === 'sell' ? 'sale' : 'rent';
      result = result.filter((p) => p.listingType === targetType);
    }
    return result;
  }, [allProducts, categoryType, categoryId]);

  // Apply local pagination if page is specified
  const paginatedProducts = useMemo(() => {
    if (page == null) return filteredProducts;
    const start = (page - 1) * PER_PAGE;
    return filteredProducts.slice(start, start + PER_PAGE);
  }, [filteredProducts, page]);

  const products = page != null ? paginatedProducts : filteredProducts;
  const saleProducts = useMemo(
    () => allProducts.filter((p) => p.listingType === 'sale'),
    [allProducts]
  );
  const rentProducts = useMemo(
    () => allProducts.filter((p) => p.listingType === 'rent'),
    [allProducts]
  );

  const totalCount = filteredProducts.length;
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
      clearCache('products');
      fetchAllProducts();
    }
  };
}