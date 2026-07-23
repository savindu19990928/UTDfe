
import { useState, useCallback } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { clearCache } from '../utils/apiCache';

export interface MachineInput {
  id?: number;
  machine_number: string;
  max_use_count: number;
  delete?: boolean;
}

export interface SaleProductPayload {
  name: string;
  category: number;
  unit: string;
  price: string;
  is_stock_tracked: boolean;
  initial_stock?: number;
}

export interface RentalProductMachinesPayload {
  name: string;
  category: number;
  unit: string;
  price: string;
  machines: MachineInput[];
}

export interface RentalProductBulkPayload {
  name: string;
  category: number;
  unit: string;
  price: string;
  is_stock_tracked: boolean;
  initial_stock?: number;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const errData = await res.json().catch(() => null);
  if (!errData) return `${fallback} (${res.status})`;
  if (typeof errData === 'string') return errData;
  return (
    errData.detail ||
    errData.message ||
    Object.values(errData).flat().join(', ') ||
    `${fallback} (${res.status})`);

}

export function useProductAdmin() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (
    url: string,
    method: string,
    body?: unknown)
    : Promise<any> => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch(url, {
          method,
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: body !== undefined ? JSON.stringify(body) : undefined
        });
        if (!res.ok) {
          throw new Error(await parseError(res, 'Request failed'));
        }
        clearCache('products');
        if (res.status === 204) return true;
        return await res.json().catch(() => true);
      } catch (err: any) {
        setError(err.message || 'Request failed');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const createSaleProduct = useCallback(
    (payload: SaleProductPayload) =>
    run(`${API_URL}products/create_sale/`, 'POST', payload),
    [run]
  );

  const createRentalProductWithMachines = useCallback(
    (payload: RentalProductMachinesPayload) =>
    run(`${API_URL}products/create_rental/`, 'POST', payload),
    [run]
  );

  const createRentalProductBulk = useCallback(
    (payload: RentalProductBulkPayload) =>
    run(`${API_URL}products/create_rental/`, 'POST', payload),
    [run]
  );

  const updateProduct = useCallback(
    (id: string | number, payload: Record<string, unknown>) =>
    run(`${API_URL}products/${id}/`, 'PATCH', payload),
    [run]
  );

  const deleteProduct = useCallback(
    (id: string | number) => run(`${API_URL}products/${id}/`, 'DELETE'),
    [run]
  );

  const createMachine = useCallback(
    (payload: {product: number;machine_number: string;max_use_count: number;}) =>
    run(`${API_URL}machines/`, 'POST', payload),
    [run]
  );

  const updateMachine = useCallback(
    (id: string | number, payload: Record<string, unknown>) =>
    run(`${API_URL}machines/${id}/`, 'PATCH', payload),
    [run]
  );

  const deleteMachine = useCallback(
    (id: string | number) => run(`${API_URL}machines/${id}/`, 'DELETE'),
    [run]
  );

  return {
    submitting,
    error,
    setError,
    createSaleProduct,
    createRentalProductWithMachines,
    createRentalProductBulk,
    updateProduct,
    deleteProduct,
    createMachine,
    updateMachine,
    deleteMachine
  };
}