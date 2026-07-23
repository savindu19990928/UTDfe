
import { useState, useCallback } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';

export type ReportType =
'stock_all' |
'stock_sales' |
'stock_rentals' |
'profit' |
'financial' |
'damaged' |
'customers' |
'banned' |
'machines';

export interface ReportResponse {
  report_type: string;
  start_date?: string;
  end_date?: string;
  data: Record<string, any>;
}

export function useReports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [machineReport, setMachineReport] = useState<any[] | null>(null);

  const fetchReport = useCallback(
    async (
    reportType: ReportType,
    startDate?: string,
    endDate?: string)
    : Promise<void> => {
      setLoading(true);
      setError(null);
      setReport(null);
      setMachineReport(null);
      try {
        if (reportType === 'machines') {
          const res = await fetch(`${API_URL}machine-report/`, {
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json'
            }
          });
          if (!res.ok) throw new Error(`Failed to load report (${res.status})`);
          const data = await res.json();
          setMachineReport(Array.isArray(data) ? data : []);
          return;
        }

        const params = new URLSearchParams();
        params.set('report_type', reportType);
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);

        const res = await fetch(`${API_URL}reports/?${params.toString()}`, {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          if (res.status === 403)
          throw new Error('You do not have permission to view reports.');
          throw new Error(`Failed to load report (${res.status})`);
        }
        const data = await res.json();
        setReport(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load report');
        console.error('Report fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, report, machineReport, fetchReport };
}