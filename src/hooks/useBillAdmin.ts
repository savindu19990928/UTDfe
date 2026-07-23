
import { useState, useCallback } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { clearCache } from '../utils/apiCache';

async function parseError(res: Response, fallback: string): Promise<string> {
  const errData = await res.json().catch(() => null);
  if (!errData) return `${fallback} (${res.status})`;
  if (typeof errData === 'string') return errData;
  return (
    errData.detail ||
    errData.message ||
    errData.error ||
    Object.values(errData).flat().join(', ') ||
    `${fallback} (${res.status})`);

}

export function useBillAdmin() {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const post = useCallback(
    async (url: string, cacheKey: string, key: string): Promise<any> => {
      setSubmitting(key);
      setError(null);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error(await parseError(res, 'Request failed'));
        }
        clearCache(cacheKey);
        return await res.json().catch(() => true);
      } catch (err: any) {
        setError(err.message || 'Request failed');
        throw err;
      } finally {
        setSubmitting(null);
      }
    },
    []
  );

  const cancelSaleBill = useCallback(
    (id: string | number) =>
    post(`${API_URL}sales/${id}/cancel/`, 'sales:', `sale-${id}`),
    [post]
  );

  const cancelRentalBill = useCallback(
    (id: string | number) =>
    post(`${API_URL}rentals/${id}/cancel/`, 'rentals:', `rental-${id}`),
    [post]
  );

  return { submitting, error, setError, cancelSaleBill, cancelRentalBill };
}