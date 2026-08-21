import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getCached, setCache, isFresh, sharedRequest, getInflight } from '../utils/apiCache';

export interface RentalCondition {
  id: number | string;
  text: string;
}

interface UseRentalConditionsReturn {
  conditions: RentalCondition[];
  loading: boolean;
  error: string | null;
}

const CACHE_KEY = 'rentalConditions';

export async function prefetchRentalConditions(): Promise<void> {
  if (isFresh(CACHE_KEY, Infinity)) return;
  try {
    await sharedRequest<RentalCondition[]>(CACHE_KEY, async () => {
      const res = await fetch(`${API_URL}rental-conditions/active/`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`Failed to fetch rental conditions (${res.status})`);
      const data = await res.json();

      const rawList: any[] = Array.isArray(data) ? data : data.results ? data.results : [data];
      const mapped: RentalCondition[] = rawList.map((item: any, index: number) => ({
        id: item.id ?? index,
        text: item.text || item.condition || item.description || item.content || String(item)
      }));

      setCache(CACHE_KEY, mapped);
      return mapped;
    });
  } catch (err) {
    // Prefetch is best effort
    console.error('Failed to prefetch rental conditions:', err);
  }
}

export function useRentalConditions(): UseRentalConditionsReturn {
  const [conditions, setConditions] = useState<RentalCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConditions = useCallback(async () => {
    // Conditions rarely change — keep them for the entire session
    const cached = getCached<RentalCondition[]>(CACHE_KEY, Infinity);
    if (cached) {
      setConditions(cached);
      setLoading(false);
      return;
    }

    const pending = getInflight<RentalCondition[]>(CACHE_KEY);
    if (pending) {
      try {
        const mapped = await pending;
        setConditions(mapped);
        setLoading(false);
        return;
      } catch {
        // Fall through to fetch
      }
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}rental-conditions/active/`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`Failed to fetch rental conditions (${res.status})`);
      const data = await res.json();

      // Handle array, paginated { results }, or single object responses
      const rawList: any[] = Array.isArray(data) ? data : data.results ? data.results : [data];

      const mapped: RentalCondition[] = rawList.map((item: any, index: number) => ({
        id: item.id ?? index,
        text: item.text || item.condition || item.description || item.content || String(item)
      }));

      setConditions(mapped);
      setCache(CACHE_KEY, mapped);
    } catch (err: any) {
      if (!cached) {
        setError(err.message || 'Failed to load rental conditions');
      }
      console.error('Rental conditions fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConditions();
  }, [fetchConditions]);

  return { conditions, loading, error };
}