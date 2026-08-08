import { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getCached, setCache, sharedRequest } from '../utils/apiCache';
import { mapApiProduct } from './useProducts';

export type ProductSearchType = 'sale' | 'rent';

interface UseProductSearchOptions {
  type: ProductSearchType;
  query?: string;
  enabled?: boolean;
  debounceMs?: number;
}

interface UseProductSearchReturn {
  results: Product[];
  loading: boolean;
  error: string | null;
}

const SEARCH_ENDPOINT: Record<ProductSearchType, string> = {
  sale: 'products/search_sale_products/',
  rent: 'products/search_rental_products/'
};

// Search results are intentionally lightweight — the endpoints return only
// id, name, item_number, barcode and price. Stock and category are hydrated
// separately via fetchProductDetails() before a product is added to a bill.
function mapSearchResult(raw: any, type: ProductSearchType): Product {
  const price = parseFloat(raw.price ?? 0) || 0;
  return {
    id: String(raw.id),
    name: raw.name || '',
    category: '',
    listingType: type,
    salePrice: type === 'sale' ? price : 0,
    rentPricePerDay: type === 'rent' ? price : null,
    stock: 0,
    itemCode: raw.item_number || raw.item_code || undefined,
    barcode: raw.barcode || undefined
  };
}

// Fetch the full product record so stock limits, category and machine
// tracking are enforced against real data after a search hit is picked.
export async function fetchProductDetails(
id: string)
: Promise<Product | null> {
  const cacheKey = `productDetail:${id}`;
  const cached = getCached<Product>(cacheKey, 60_000);
  if (cached) return cached;
  try {
    const data = await sharedRequest(cacheKey, async () => {
      const res = await fetch(`${API_URL}products/${id}/`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`Failed to load product (${res.status})`);
      return res.json();
    });
    const product = mapApiProduct(data);
    setCache(cacheKey, product);
    return product;
  } catch (err) {
    console.error('Product detail fetch error:', err);
    return null;
  }
}

export function useProductSearch({
  type,
  query,
  enabled = true,
  debounceMs = 200
}: UseProductSearchOptions): UseProductSearchReturn {
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  useEffect(() => {
    const term = debouncedQuery?.trim();
    if (!enabled || !term) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cacheKey = `productSearch:${type}:${term.toLowerCase()}`;
    const cached = getCached<Product[]>(cacheKey, 60_000);
    if (cached) {
      setResults(cached);
      setLoading(false);
      setError(null);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const res = await fetch(
          `${API_URL}${SEARCH_ENDPOINT[type]}?q=${encodeURIComponent(term)}`,
          {
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        );
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        const data = await res.json();
        const rawList: any[] = Array.isArray(data) ? data : data?.results || [];
        const mapped = rawList.map((raw) => mapSearchResult(raw, type));
        setCache(cacheKey, mapped);
        setResults(mapped);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setResults([]);
        setError(err.message || 'Failed to search products');
        console.error('Product search error:', err);
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [type, debouncedQuery, enabled]);

  return { results, loading, error };
}