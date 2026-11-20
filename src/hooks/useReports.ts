
import { useState, useCallback } from 'react';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { StockMovementReportItem } from '../types/reports';

export type ReportType =
  | 'financial'
  | 'expenses'
  | 'opened_bills'
  | 'unsettled_bills'
  | 'closed_bills'
  | 'stock_all'
  | 'stock_sales'
  | 'stock_rentals'
  | 'stock_movements'
  | 'damaged'
  | 'customers'
  | 'banned'
  | 'machines'
  | 'machine_history'
  | 'rented_items'
  | 'held_documents'
  | 'audit_log'
  | 'user_history'
  | 'all_users_history';

export interface FetchReportOptions {
  machineId?: number | string;
  machineNumber?: string;
  productId?: number | string;
  productLabel?: string;
  movementType?: '' | 'in' | 'out';
  search?: string;
  userId?: number | string;
  username?: string;
  category?: string;
}

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
      endDate?: string,
      options?: FetchReportOptions
    ): Promise<void> => {
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

        if (reportType === 'stock_movements') {
          const productIdStr =
            options?.productId != null ? String(options.productId).trim() : '';
          const movementTypeStr = options?.movementType || '';
          const searchStr = options?.search?.trim() || '';

          const baseParams = new URLSearchParams();
          if (startDate) baseParams.set('start_date', startDate);
          if (endDate) baseParams.set('end_date', endDate);
          if (productIdStr) baseParams.set('product', productIdStr);
          if (movementTypeStr) baseParams.set('movement_type', movementTypeStr);
          if (searchStr) baseParams.set('search', searchStr);
          baseParams.set('ordering', '-created_at');

          const summaryParams = new URLSearchParams();
          if (productIdStr) summaryParams.set('product_id', productIdStr);
          if (startDate) summaryParams.set('start_date', startDate);
          if (endDate) summaryParams.set('end_date', endDate);
          const summaryQs = summaryParams.toString();

          const summaryPromise = fetch(
            `${API_URL}stock-movements/summary/${summaryQs ? `?${summaryQs}` : ''}`,
            {
              headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
              }
            }
          )
            .then(async (r) => (r.ok ? r.json().catch(() => null) : null))
            .catch(() => null);

          const MAX_PAGES = 50;
          const allMovements: StockMovementReportItem[] = [];
          let apiTotalCount: number | undefined;
          let isTruncated = false;

          for (let page = 1; page <= MAX_PAGES; page++) {
            const pageParams = new URLSearchParams(baseParams);
            if (page > 1) pageParams.set('page', String(page));
            const qs = pageParams.toString();

            const res = await fetch(
              `${API_URL}stock-movements/${qs ? `?${qs}` : ''}`,
              {
                headers: {
                  ...getAuthHeaders(),
                  'Content-Type': 'application/json'
                }
              }
            );

            if (!res.ok) {
              if (res.status === 403) {
                throw new Error(
                  'You do not have permission to view stock movement reports (Admin / Staff access required).'
                );
              }
              const errData = await res.json().catch(() => null);
              const msg =
                errData?.detail ||
                errData?.error ||
                errData?.message ||
                `Failed to load stock movement report (${res.status})`;
              throw new Error(msg);
            }

            const data = await res.json();
            if (Array.isArray(data)) {
              allMovements.push(...data);
              apiTotalCount = data.length;
              break;
            }

            const results: StockMovementReportItem[] = Array.isArray(data.results)
              ? data.results
              : [];
            allMovements.push(...results);
            if (typeof data.count === 'number') {
              apiTotalCount = data.count;
            }
            const hasNext = Boolean(data.next);
            if (!hasNext) break;
            if (page === MAX_PAGES) {
              isTruncated = true;
            }
          }

          let computedStockIn = 0;
          let computedStockOut = 0;
          allMovements.forEach((m) => {
            const rawQty =
              typeof m.quantity === 'number'
                ? m.quantity
                : Number(String(m.quantity ?? 0).replace(/,/g, ''));
            const safeQty = Number.isFinite(rawQty) ? rawQty : 0;
            if (m.movement_type === 'in') computedStockIn += safeQty;
            else if (m.movement_type === 'out') computedStockOut += safeQty;
          });
          const computedNet = computedStockIn - computedStockOut;

          const summaryData = await summaryPromise;
          const canUseApiSummary =
            Boolean(summaryData) && !movementTypeStr && !searchStr;

          const parseSummaryNum = (v: any, fallback: number): number => {
            if (v == null || v === '') return fallback;
            const n =
              typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
            return Number.isFinite(n) ? n : fallback;
          };

          const total_movements =
            canUseApiSummary && summaryData.total_movements != null
              ? Number(summaryData.total_movements) || 0
              : allMovements.length;
          const total_stock_in = canUseApiSummary
            ? parseSummaryNum(summaryData.total_stock_in, computedStockIn)
            : computedStockIn;
          const total_stock_out = canUseApiSummary
            ? parseSummaryNum(summaryData.total_stock_out, computedStockOut)
            : computedStockOut;
          const net_movement = canUseApiSummary
            ? parseSummaryNum(summaryData.net_movement, computedNet)
            : computedNet;

          setReport({
            report_type: 'stock_movements',
            start_date: startDate,
            end_date: endDate,
            data: {
              start_date: startDate,
              end_date: endDate,
              product_id: productIdStr || undefined,
              product_label: options?.productLabel || undefined,
              movement_type: movementTypeStr || '',
              search: searchStr,
              total_movements,
              total_stock_in,
              total_stock_out,
              net_movement,
              total_count: apiTotalCount ?? allMovements.length,
              is_truncated: isTruncated,
              movements: allMovements
            }
          });
          return;
        }

        const params = new URLSearchParams();
        params.set('report_type', reportType);
        if (
          startDate &&
          reportType !== 'opened_bills' &&
          reportType !== 'unsettled_bills' &&
          reportType !== 'rented_items' &&
          reportType !== 'held_documents'
        ) {
          params.set('start_date', startDate);
        }
        if (endDate) params.set('end_date', endDate);

        if (reportType === 'machine_history') {
          const machineIdStr =
            options?.machineId != null ? String(options.machineId).trim() : '';
          const machineNumberStr =
            options?.machineNumber != null ? options.machineNumber.trim() : '';
          const productIdStr =
            options?.productId != null ? String(options.productId).trim() : '';

          if (!machineIdStr && !machineNumberStr) {
            throw new Error(
              'Please select a machine or enter a machine number / machine ID.'
            );
          }

          if (machineIdStr) {
            params.set('machine_id', machineIdStr);
          }
          if (machineNumberStr) {
            params.set('machine_number', machineNumberStr);
          }
          if (productIdStr) {
            params.set('product_id', productIdStr);
          }
        }

        if (
          reportType === 'audit_log' ||
          reportType === 'user_history' ||
          reportType === 'all_users_history'
        ) {
          const userIdStr =
            options?.userId != null ? String(options.userId).trim() : '';
          const usernameStr =
            options?.username != null ? options.username.trim() : '';

          if (userIdStr || usernameStr) {
            params.set('report_type', 'user_history');
            if (userIdStr) params.set('user_id', userIdStr);
            if (usernameStr) params.set('username', usernameStr);
          } else {
            params.set('report_type', 'all_users_history');
          }

          if (options?.category && options.category.trim()) {
            params.set('category', options.category.trim());
          }
        }

        const res = await fetch(`${API_URL}reports/?${params.toString()}`, {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          if (res.status === 403)
            throw new Error('You do not have permission to view reports.');
          const errData = await res.json().catch(() => null);
          const msg =
            errData?.error ||
            errData?.detail ||
            errData?.message ||
            `Failed to load report (${res.status})`;
          throw new Error(msg);
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