
import { useState, useCallback } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';

export interface ExceededMachine {
  id: number;
  product: number;
  product_name: string;
  category_name: string;
  machine_number: string;
  max_use_count: number;
  used_count: number;
  total_used_count: number;
  needs_reset: boolean;
  is_currently_rented: boolean;
  is_damaged: boolean;
  is_active: boolean;
  created_at: string;
}

export function useMachines() {
  const [machines, setMachines] = useState<ExceededMachine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchExceeded = useCallback(async (productId?: number | string, page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    setError(null);
    setCurrentPage(page);
    try {
      const params = new URLSearchParams();
      if (productId) params.append('product', String(productId));
      params.append('page', String(page));
      params.append('page_size', String(pageSize));

      const res = await fetch(`${API_URL}machines/exceeded_max_use/?${params.toString()}`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to load machines (${res.status})`);
      }
      const data = await res.json();

      if (Array.isArray(data)) {
        setMachines(data);
        setTotalCount(data.length);
        setTotalPages(1);
      } else {
        setMachines(data.results || []);
        setTotalCount(data.count || data.results?.length || 0);
        setTotalPages(data.total_pages || Math.ceil((data.count || 0) / pageSize) || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load machines');
    } finally {
      setLoading(false);
    }
  }, []);

  const resetMachine = useCallback(async (id: number): Promise<boolean> => {
    setResettingId(id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}machines/${id}/reset_used_count/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to reset machine (${res.status})`);
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to reset machine');
      return false;
    } finally {
      setResettingId(null);
    }
  }, []);

  return { machines, loading, error, resettingId, fetchExceeded, resetMachine, totalCount, currentPage, totalPages };
}