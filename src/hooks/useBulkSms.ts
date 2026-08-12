import { useCallback, useState } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';

interface BulkSmsResponse {
  detail?: string;
  message?: string;
}

export function useBulkSms() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const sendBulkSms = useCallback(async (message: string): Promise<boolean> => {
    setSending(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}customers/send-bulk-sms/`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            'Super user access is required to send a bulk message.'
          );
        }

        let detail = `Failed to send the message (${res.status}).`;
        try {
          const errData = await res.json();
          const parsed =
          errData?.detail ||
          errData?.message ||
          Object.values(errData ?? {}).
          flat().
          join(', ');
          if (parsed) detail = String(parsed);
        } catch {

          // Response had no JSON body — keep the status-based message.
        }throw new Error(detail);
      }

      const data: BulkSmsResponse = await res.json().catch(() => ({}));
      setResult(data.detail || data.message || 'Message sent to customers.');
      return true;
    } catch (err) {
      setError(
        err instanceof Error ?
        err.message :
        'Network error. Check your connection and try again.'
      );
      return false;
    } finally {
      setSending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { sending, error, result, sendBulkSms, reset };
}