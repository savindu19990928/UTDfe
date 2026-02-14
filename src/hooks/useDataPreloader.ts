import { useEffect } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getCached, setCache, isFresh } from '../utils/apiCache';

/**
 * Data preloader — eagerly fetches core data on app load.
 * Products, customers, and categories are fetched once and cached.
 * All hooks then read from cache and filter locally.
 */
export function useDataPreloader() {
  useEffect(() => {
    const headers = {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    };

    // Only preload if not already cached
    const preload = async (
    cacheKey: string,
    url: string,
    mapper?: (data: any) => any) =>
    {
      if (isFresh(cacheKey, 60_000)) return;
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) return;
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : data.results || [];
        setCache(cacheKey, mapper ? mapper(rawList) : rawList);
      } catch {

        // Silent fail — hooks will fetch on demand
      }};

    // Preload categories (small, fast)
    preload('categories:all', `${API_URL}categories/`, (list) =>
    list.map((c: any) => ({
      id: c.id,
      name: c.name || c.category_name || '',
      category_type: c.category_type || undefined
    }))
    );

    // Preload customers
    if (!isFresh('customers:all', 60_000)) {
      preload('customers:all', `${API_URL}customers/`);
    }
  }, []);
}