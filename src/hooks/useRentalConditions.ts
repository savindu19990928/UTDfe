import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';

export interface RentalCondition {
  id: number | string;
  text: string;
}

interface UseRentalConditionsReturn {
  conditions: RentalCondition[];
  loading: boolean;
  error: string | null;
}

export function useRentalConditions(): UseRentalConditionsReturn {
  const [conditions, setConditions] = useState<RentalCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConditions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}rental-conditions/active/`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok)
      throw new Error(`Failed to fetch rental conditions (${res.status})`);
      const data = await res.json();

      // Handle array, paginated { results }, or single object responses
      const rawList: any[] = Array.isArray(data) ?
      data :
      data.results ?
      data.results :
      [data];

      const mapped: RentalCondition[] = rawList.map(
        (item: any, index: number) => ({
          id: item.id ?? index,
          text:
          item.text ||
          item.condition ||
          item.description ||
          item.content ||
          String(item)
        })
      );

      setConditions(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load rental conditions');
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