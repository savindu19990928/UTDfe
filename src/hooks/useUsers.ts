import { useState, useCallback, useEffect, useRef } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';

export interface UserAccount {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  role: 'superuser' | 'normal';
  date_joined: string;
  last_login: string | null;
}

export interface UserFilters {
  roleFilter?: '' | 'superuser' | 'normal';
  activeFilter?: '' | 'active' | 'inactive';
  search?: string;
  ordering?: string;
  page?: number;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  confirm_password?: string;
  phone_number?: string;
  is_superuser: boolean;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string | null;
  is_superuser?: boolean;
  is_active?: boolean;
  password?: string;
  confirm_password?: string;
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

function mapUser(raw: any): UserAccount {
  const isSuper = Boolean(raw.is_superuser);
  return {
    id: Number(raw.id),
    username: raw.username || '',
    email: raw.email || '',
    first_name: raw.first_name || '',
    last_name: raw.last_name || '',
    phone_number: raw.phone_number || raw.mobile_number || '',
    is_superuser: isSuper,
    is_staff: Boolean(raw.is_staff),
    is_active: raw.is_active !== false,
    role: raw.role === 'superuser' || isSuper ? 'superuser' : 'normal',
    date_joined: raw.date_joined || '',
    last_login: raw.last_login ?? null
  };
}

export function useUsers(filters: UserFilters) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchUsers = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.roleFilter === 'superuser') {
        params.set('is_superuser', 'true');
      } else if (filters.roleFilter === 'normal') {
        params.set('is_superuser', 'false');
      }
      if (filters.activeFilter === 'active') {
        params.set('is_active', 'true');
      } else if (filters.activeFilter === 'inactive') {
        params.set('is_active', 'false');
      }
      if (filters.search && filters.search.trim()) {
        params.set('search', filters.search.trim());
      }
      if (filters.ordering) {
        params.set('ordering', filters.ordering);
      }
      if (filters.page && filters.page > 1) {
        params.set('page', String(filters.page));
      }

      const qs = params.toString();
      const res = await fetch(`${API_URL}users/${qs ? `?${qs}` : ''}`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Only Admins have permission to manage users.');
        }
        const errData = await res.json().catch(() => null);
        throw new Error(
          extractErrorMessage(errData, `Failed to load users (${res.status})`)
        );
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped = data.map(mapUser);
        setUsers(mapped);
        setTotalCount(mapped.length);
        setTotalPages(1);
      } else {
        const rawResults = Array.isArray(data.results) ? data.results : [];
        const mapped = rawResults.map(mapUser);
        const count =
          typeof data.count === 'number' ? data.count : mapped.length;
        const pages =
          typeof data.total_pages === 'number'
            ? Math.max(1, data.total_pages)
            : Math.max(1, Math.ceil(count / PAGE_SIZE));
        setUsers(mapped);
        setTotalCount(count);
        setTotalPages(pages);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to load users');
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [
    filters.roleFilter,
    filters.activeFilter,
    filters.search,
    filters.ordering,
    filters.page
  ]);

  useEffect(() => {
    fetchUsers();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchUsers]);

  const fetchSingleUser = useCallback(
    async (id: number): Promise<UserAccount | null> => {
      try {
        const res = await fetch(`${API_URL}users/${id}/`, {
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
              `Failed to load user #${id} (${res.status})`
            )
          );
        }
        return mapUser(await res.json());
      } catch (err: any) {
        setActionError(err.message || 'Failed to load user');
        return null;
      }
    },
    []
  );

  const createUser = useCallback(
    async (payload: CreateUserPayload): Promise<UserAccount> => {
      setSubmitting(true);
      setActionError(null);
      try {
        const res = await fetch(`${API_URL}users/`, {
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
              `Failed to create user (${res.status})`
            )
          );
        }
        const created = mapUser(await res.json());
        await fetchUsers();
        return created;
      } catch (err: any) {
        setActionError(err.message || 'Failed to create user');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchUsers]
  );

  const updateUser = useCallback(
    async (id: number, payload: UpdateUserPayload): Promise<UserAccount> => {
      setSubmitting(true);
      setActionError(null);
      try {
        const res = await fetch(`${API_URL}users/${id}/`, {
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
              `Failed to update user (${res.status})`
            )
          );
        }
        const updated = mapUser(await res.json());
        await fetchUsers();
        return updated;
      } catch (err: any) {
        setActionError(err.message || 'Failed to update user');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchUsers]
  );

  const deleteUser = useCallback(
    async (id: number): Promise<void> => {
      setSubmitting(true);
      setActionError(null);
      try {
        const res = await fetch(`${API_URL}users/${id}/`, {
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
              `Failed to delete user (${res.status})`
            )
          );
        }
        await fetchUsers();
      } catch (err: any) {
        setActionError(err.message || 'Failed to delete user');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchUsers]
  );

  return {
    users,
    loading,
    error,
    totalCount,
    totalPages,
    submitting,
    actionError,
    setActionError,
    refetch: fetchUsers,
    fetchSingleUser,
    createUser,
    updateUser,
    deleteUser
  };
}
