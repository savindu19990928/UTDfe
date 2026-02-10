import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getCached, setCache, isFresh } from '../utils/apiCache';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const categoryType = options?.categoryType;
  const categoryId = options?.categoryId;
  const page = options?.page;
  const enabled = options?.enabled !== false; // default true

  const fetchProducts = useCallback(async () => {
    if (!enabled) return;

    let url = `${API_URL}products/`;
    const params: string[] = [];

    if (categoryId) {
      params.push(`category=${categoryId}`);
    } else if (categoryType) {
      params.push(`category__category_type=${categoryType}`);
    }
    if (page != null) {
      params.push(`page=${page}`);
    }
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    const cacheKey = `products:${url}`;

    // Use cached data immediately if available (stale-while-revalidate)
    const cached = getCached<{products: Product[];totalCount: number;}>(
      cacheKey,
      60_000
    );
    if (cached) {
      setProducts(cached.products);
      setTotalCount(cached.totalCount);
      setLoading(false);
      // If cache is still fresh, skip network request
      if (isFresh(cacheKey, 30_000)) return;
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
      if (!res.ok) throw new Error(`Failed to fetch products (${res.status})`);
      const data = await res.json();

      let mapped: Product[];
      let count: number;

      if (Array.isArray(data)) {
        mapped = data.map(mapApiProduct);
        count = data.length;
      } else {
        const rawList = data.results || [];
        mapped = rawList.map(mapApiProduct);
        count = data.count ?? rawList.length;
      }

      setProducts(mapped);
      setTotalCount(count);
      setCache(cacheKey, { products: mapped, totalCount: count });
    } catch (err: any) {
      // Only set error if we don't have cached data to show
      if (!cached) {
        setError(err.message || 'Failed to load products');
      }
      console.error('Product fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryType, categoryId, page, enabled]);

  useEffect(() => {
    if (enabled) {
      fetchProducts();
    }
  }, [fetchProducts, enabled]);

  const saleProducts = products.filter((p) => p.listingType === 'sale');
  const rentProducts = products.filter((p) => p.listingType === 'rent');

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
    refetch: fetchProducts
  };
}