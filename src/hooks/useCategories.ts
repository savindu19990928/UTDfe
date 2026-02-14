import { useState, useEffect, useCallback, useMemo } from 'react';
import { ApiCategory } from '../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getCached, setCache, isFresh } from '../utils/apiCache';

interface UseCategoriesReturn {
  categories: ApiCategory[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const CACHE_KEY = 'categories:all';

export function useCategories(
categoryType?: 'sell' | 'rent')
: UseCategoriesReturn {
  const [allCategories, setAllCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    // Categories rarely change — use long TTL cache
    const cached = getCached<ApiCategory[]>(CACHE_KEY, 10 * 60_000);
    if (cached) {
      setAllCategories(cached);
      setLoading(false);
      if (isFresh(CACHE_KEY, 5 * 60_000)) return;
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const res = await fetch(`${API_URL}categories/`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`Failed to fetch categories (${res.status})`);
      const data = await res.json();
      const rawList: any[] = Array.isArray(data) ? data : data.results || [];

      const mapped: ApiCategory[] = rawList.map((c: any) => ({
        id: c.id,
        name: c.name || c.category_name || '',
        category_type: c.category_type || undefined
      }));

      setAllCategories(mapped);
      setCache(CACHE_KEY, mapped);
    } catch (err: any) {
      if (!cached) {
        setError(err.message || 'Failed to load categories');
      }
      console.error('Category fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Filter locally by category_type — no separate API calls
  const categories = useMemo(() => {
    if (!categoryType) return allCategories;
    return allCategories.filter((c) => c.category_type === categoryType);
  }, [allCategories, categoryType]);

  return { categories, loading, error, refetch: fetchCategories };
}