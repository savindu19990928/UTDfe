import { useState, useEffect, useCallback } from 'react';
import { Expense } from '../types';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { getCached, setCache, isFresh, clearCache } from '../utils/apiCache';

interface UseExpensesReturn {
  expenses: Expense[];
  totalExpenses: number;
  loading: boolean;
  error: string | null;
  submitting: boolean;
  addExpense: (description: string, amount: number) => Promise<boolean>;
  deleteExpense: (id: string | number) => Promise<boolean>;
  refetch: () => void;
}

export function useExpenses(): UseExpensesReturn {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = useCallback(async () => {
    const cacheKey = `expenses`;

    // Stale-while-revalidate
    const cached = getCached<Expense[]>(cacheKey, 60_000);
    if (cached) {
      setExpenses(cached);
      setLoading(false);
      if (isFresh(cacheKey, 30_000)) return;
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const res = await fetch(`${API_URL}expense/`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`Failed to fetch expenses (${res.status})`);
      const data = await res.json();

      const rawList: any[] = Array.isArray(data) ? data : data.results || [];
      const mapped: Expense[] = rawList.map((e: any) => ({
        id: e.id,
        description: e.description || '',
        amount: parseFloat(e.amount ?? 0),
        date: e.created_at ? new Date(e.created_at).toLocaleDateString() : '',
        created_by_name: e.created_by_name || undefined
      }));
      setExpenses(mapped);
      setCache(cacheKey, mapped);
    } catch (err: any) {
      if (!cached) {
        setError(err.message || 'Failed to load expenses');
      }
      console.error('Expense fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = useCallback(
    async (description: string, amount: number): Promise<boolean> => {
      setSubmitting(true);
      try {
        const res = await fetch(`${API_URL}expense/`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            description,
            amount: amount.toFixed(2)
          })
        });
        if (!res.ok) throw new Error(`Failed to add expense (${res.status})`);

        clearCache('expenses');
        await fetchExpenses();
        return true;
      } catch (err: any) {
        console.error('Add expense error:', err);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchExpenses]
  );

  const deleteExpense = useCallback(
    async (id: string | number): Promise<boolean> => {
      try {
        const res = await fetch(`${API_URL}expense/${id}/`, {
          method: 'DELETE',
          headers: {
            ...getAuthHeaders()
          }
        });
        if (!res.ok) throw new Error(`Failed to delete expense (${res.status})`);

        clearCache('expenses');
        await fetchExpenses();
        return true;
      } catch (err: any) {
        console.error('Delete expense error:', err);
        return false;
      }
    },
    [fetchExpenses]
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    expenses,
    totalExpenses,
    loading,
    error,
    submitting,
    addExpense,
    deleteExpense,
    refetch: fetchExpenses
  };
}