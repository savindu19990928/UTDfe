import { useState, useCallback, useEffect, useRef } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { clearCache } from '../utils/apiCache';

export type CategoryType = 'sell' | 'rent';

export interface CategoryRecord {
  id: number;
  name: string;
  category_type: CategoryType;
  description: string;
  product_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryFilters {
  categoryType?: '' | CategoryType;
  search?: string;
  page?: number;
}

export interface CreateCategoryPayload {
  name: string;
  category_type: CategoryType;
  description?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  category_type?: CategoryType;
  description?: string;
}

const PAGE_SIZE = 20;

function extractErrorMessage(errData: any, fallback: string): string {
  if (!errData) return fallback;
  if (typeof errData === 'string') return errData;
  if (errData.detail) return String(errData.detail);
  if (errData.error) return String(errData.error);
  if (errData.message) return String(errData.message);
  if (typeof errData === 'object') {
    const parts = Object.entries(errData).map(([k, v]) => {
      const val = Array.isArray(v) ? v.join(', ') : String(v);
      return k === 'non_field_errors' ? val : `${k}: ${val}`;
    });
    if (parts.length > 0) return parts.join(' | ');
  }
  return fallback;
}

function mapCategory(raw: any): CategoryRecord {
  return {
    id: Number(raw.id ?? raw.pk),
    name: raw.name || raw.category_name || '',
    category_type: raw.category_type === 'rent' ? 'rent' : 'sell',
    description: raw.description || '',
    product_count: Number(raw.product_count ?? 0),
    created_at: raw.created_at,
    updated_at: raw.updated_at
  };
}

export function useCategoryAdmin(filters: CategoryFilters) {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchCategories = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.categoryType) {
        params.set('category_type', filters.categoryType);
      }
      if (filters.search && filters.search.trim()) {
        params.set('search', filters.search.trim());
      }
      if (filters.page && filters.page > 1) {
        params.set('page', String(filters.page));
      }

      const qs = params.toString();
      const res = await fetch(`${API_URL}categories/${qs ? `?${qs}` : ''}`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          extractErrorMessage(
            errData,
            `Failed to load categories (${res.status})`
          )
        );
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped = data.map(mapCategory);
        setCategories(mapped);
        setTotalCount(mapped.length);
        setTotalPages(1);
      } else {
        const rawResults = Array.isArray(data.results) ? data.results : [];
        const mapped = rawResults.map(mapCategory);
        const count =
          typeof data.count === 'number' ? data.count : mapped.length;
        const pages =
          typeof data.total_pages === 'number'
            ? Math.max(1, data.total_pages)
            : Math.max(1, Math.ceil(count / PAGE_SIZE));
        setCategories(mapped);
        setTotalCount(count);
        setTotalPages(pages);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to load categories');
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [filters.categoryType, filters.search, filters.page]);

  useEffect(() => {
    fetchCategories();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchCategories]);

  const fetchSingleCategory = useCallback(
    async (id: number): Promise<CategoryRecord | null> => {
      try {
        const res = await fetch(`${API_URL}categories/${id}/`, {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            extractErrorMessage(
              errData,
              `Failed to load category #${id} (${res.status})`
            )
          );
        }
        return mapCategory(await res.json());
      } catch (err: any) {
        setActionError(err.message || 'Failed to load category');
        return null;
      }
    },
    []
  );

  const createCategory = useCallback(
    async (payload: CreateCategoryPayload): Promise<CategoryRecord> => {
      setSubmitting(true);
      setActionError(null);
      try {
        const res = await fetch(`${API_URL}categories/`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            extractErrorMessage(
              errData,
              `Failed to create category (${res.status})`
            )
          );
        }
        const created = mapCategory(await res.json());
        clearCache('categories:');
        await fetchCategories();
        return created;
      } catch (err: any) {
        setActionError(err.message || 'Failed to create category');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchCategories]
  );

  const updateCategory = useCallback(
    async (
      id: number,
      payload: UpdateCategoryPayload
    ): Promise<CategoryRecord> => {
      setSubmitting(true);
      setActionError(null);
      try {
        const res = await fetch(`${API_URL}categories/${id}/`, {
          method: 'PATCH',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            extractErrorMessage(
              errData,
              `Failed to update category (${res.status})`
            )
          );
        }
        const updated = mapCategory(await res.json());
        clearCache('categories:');
        clearCache('products:');
        await fetchCategories();
        return updated;
      } catch (err: any) {
        setActionError(err.message || 'Failed to update category');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchCategories]
  );

  const deleteCategory = useCallback(
    async (id: number): Promise<void> => {
      setSubmitting(true);
      setActionError(null);
      try {
        const res = await fetch(`${API_URL}categories/${id}/`, {
          method: 'DELETE',
          headers: {
            ...getAuthHeaders()
          }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            extractErrorMessage(
              errData,
              `Failed to delete category (${res.status})`
            )
          );
        }
        clearCache('categories:');
        await fetchCategories();
      } catch (err: any) {
        setActionError(err.message || 'Failed to delete category');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchCategories]
  );

  return {
    categories,
    loading,
    error,
    totalCount,
    totalPages,
    submitting,
    actionError,
    setActionError,
    refetch: fetchCategories,
    fetchSingleCategory,
    createCategory,
    updateCategory,
    deleteCategory
  };
}
