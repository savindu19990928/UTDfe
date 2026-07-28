import { useCallback, useState } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';

export interface CashOutResult {
  message: string;
  totalCashOut: number;
}

export interface CashInResult {
  message: string;
  amount: number;
}

async function parseError(response: Response): Promise<string> {
  const data = await response.json().catch(() => null);
  return (
    data?.detail ||
    data?.message ||
    data?.error ||
    `Cash register request failed (${response.status})`);

}

export function useCashRegister() {
  const [cashingIn, setCashingIn] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cashIn = useCallback(
    async (amount: number, notes: string): Promise<CashInResult> => {
      setCashingIn(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}cash-registers/superuser-cash-in/`,
          {
            method: 'POST',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              amount: amount.toFixed(2),
              notes: notes.trim() || 'Morning Cash In'
            })
          }
        );

        if (!response.ok) {
          throw new Error(await parseError(response));
        }

        const data = await response.json().catch(() => null);
        const returnedAmount = Number.parseFloat(
          data?.amount ?? data?.transaction?.amount ?? ''
        );

        return {
          message:
          data?.message || 'Cash was added to the active register.',
          amount: Number.isFinite(returnedAmount) ? returnedAmount : amount
        };
      } catch (caughtError) {
        const message =
        caughtError instanceof Error ?
        caughtError.message :
        'Unable to add cash to the register.';
        setError(message);
        throw caughtError;
      } finally {
        setCashingIn(false);
      }
    },
    []
  );

  const cashOut = useCallback(async (): Promise<CashOutResult> => {
    setCashingOut(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}cash-registers/superuser-cash-out/`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const data = await response.json();
      const totalCashOut = Number.parseFloat(data.total_cash_out);
      if (!Number.isFinite(totalCashOut)) {
        throw new Error('The cash-out response did not include a valid total.');
      }

      return {
        message: data.message || 'Cash was removed from the active register.',
        totalCashOut
      };
    } catch (caughtError) {
      const message =
      caughtError instanceof Error ?
      caughtError.message :
      'Unable to cash out the register.';
      setError(message);
      throw caughtError;
    } finally {
      setCashingOut(false);
    }
  }, []);

  return {
    cashIn,
    cashOut,
    cashingIn,
    cashingOut,
    submitting: cashingIn || cashingOut,
    error,
    setError
  };
}