import { useState, useEffect, useCallback } from 'react';
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

export function useCategories(
categoryType?: 'sell' | 'rent')
: UseCategoriesReturn {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    const cacheKey = `categories:${categoryType || 'all'}`;

    // Stale-while-revalidate — categories rarely change, use longer TTL
    const cached = getCached<ApiCategory[]>(cacheKey, 120_000);
    if (cached) {
      setCategories(cached);
      setLoading(false);
      if (isFresh(cacheKey, 60_000)) return;
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

      let mapped: ApiCategory[] = rawList.map((c: any) => ({
        id: c.id,
        name: c.name || c.category_name || '',
        category_type: c.category_type || undefined
      }));

      // Filter by category_type if specified
      if (categoryType) {
        mapped = mapped.filter((c) => c.category_type === categoryType);
      }

      setCategories(mapped);
      setCache(cacheKey, mapped);
    } catch (err: any) {
      if (!cached) {
        setError(err.message || 'Failed to load categories');
      }
      console.error('Category fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryType]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, error, refetch: fetchCategories };
}