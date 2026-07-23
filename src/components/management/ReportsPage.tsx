

import React, { useState } from 'react';
import {
  FileText,
  Loader2,
  AlertTriangle,
  Download,
  BarChart3 } from
'lucide-react';
import { useReports, ReportType } from '../../hooks/useReports';
import { formatPrice } from '../../utils/format';

const REPORTS: {value: ReportType;label: string;dated: boolean;}[] = [
{ value: 'profit', label: 'Profit & Loss', dated: true },
{ value: 'financial', label: 'Financial Summary', dated: true },
{ value: 'stock_all', label: 'Stock — All', dated: false },
{ value: 'stock_sales', label: 'Stock — Sales', dated: false },
{ value: 'stock_rentals', label: 'Stock — Rentals', dated: false },
{ value: 'damaged', label: 'Damaged Items', dated: true },
{ value: 'customers', label: 'Customers', dated: false },
{ value: 'banned', label: 'Banned Customers', dated: false },
{ value: 'machines', label: 'Machine Usage', dated: false }];


function humanize(key: string): string {
  return key.
  replace(/_/g, ' ').
  replace(/\b\w/g, (c) => c.toUpperCase());
}

function isMoneyKey(key: string): boolean {
  return /income|profit|expense|amount|total|price|deposit|fine|value/i.test(
    key
  );
}

function isPlainObject(v: any): boolean {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

interface ExtractedTable {
  title: string;
  rows: Record<string, any>[];
}

/**
 * Recursively walk the report data and pull out every list-like structure
 * as a structured table:
 *  - arrays of objects            → table
 *  - arrays of scalars            → single-column table
 *  - objects whose values are all
 *    objects (dict of records)    → table with the key as first column
 * Scalars encountered along the way are collected as summary values.
 */
function extractReport(data: any): {
  tables: ExtractedTable[];
  summary: [string, any][];
} {
  const tables: ExtractedTable[] = [];
  const summary: [string, any][] = [];
  const seenSummaryKeys = new Set<string>();

  const addSummary = (key: string, value: any) => {
    if (!seenSummaryKeys.has(key)) {
      seenSummaryKeys.add(key);
      summary.push([key, value]);
    }
  };

  const walk = (value: any, title: string) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        tables.push({ title, rows: [] });
        return;
      }
      if (value.every((item) => isPlainObject(item))) {
        // Flatten one level of nested objects inside rows for readability
        const rows = value.map((item: Record<string, any>) => {
          const flat: Record<string, any> = {};
          Object.entries(item).forEach(([k, v]) => {
            if (isPlainObject(v)) {
              Object.entries(v as Record<string, any>).forEach(([nk, nv]) => {
                if (!Array.isArray(nv) && !isPlainObject(nv)) {
                  flat[`${k}_${nk}`] = nv;
                }
              });
            } else if (Array.isArray(v)) {
              flat[k] = v.
              map((x) => isPlainObject(x) ? JSON.stringify(x) : String(x)).
              join(', ');
            } else {
              flat[k] = v;
            }
          });
          return flat;
        });
        tables.push({ title, rows });
      } else {
        // Array of scalars → single column table
        tables.push({
          title,
          rows: value.map((v) => ({ value: v }))
        });
      }
      return;
    }

    if (isPlainObject(value)) {
      const entries = Object.entries(value as Record<string, any>);
      // Dict of records, e.g. { "Drill A": {stock: 3}, "Drill B": {stock: 5} }
      const objectValues = entries.filter(([, v]) => isPlainObject(v));
      const arrayValues = entries.filter(([, v]) => Array.isArray(v));
      const scalarValues = entries.filter(
        ([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
      );

      if (
      entries.length > 0 &&
      objectValues.length === entries.length &&
      entries.length > 1)
      {
        // Every value is an object → treat as a record dictionary
        const rows = entries.map(([k, v]) => {
          const flat: Record<string, any> = { name: k };
          Object.entries(v as Record<string, any>).forEach(([nk, nv]) => {
            if (!Array.isArray(nv) && !isPlainObject(nv)) {
              flat[nk] = nv;
            }
          });
          return flat;
        });
        tables.push({ title, rows });
        return;
      }

      // Mixed object: scalars become summary, arrays/objects recurse
      scalarValues.forEach(([k, v]) => addSummary(k, v));
      arrayValues.forEach(([k, v]) => walk(v, humanize(k)));
      objectValues.forEach(([k, v]) => walk(v, humanize(k)));
      return;
    }
  };

  walk(data, 'Records');
  return { tables, summary };
}

export function ReportsPage() {
  const { loading, error, report, machineReport, fetchReport } = useReports();
  const [reportType, setReportType] = useState<ReportType>('profit');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const meta = REPORTS.find((r) => r.value === reportType)!;

  const handleGenerate = () => {
    fetchReport(reportType, startDate || undefined, endDate || undefined);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  // Root-level scalar values (e.g. total_profit next to `data`)
  const rootSummary: [string, any][] = report ?
  Object.entries(report as Record<string, any>).filter(
    ([k, v]) =>
    k !== 'report_type' &&
    k !== 'start_date' &&
    k !== 'end_date' &&
    k !== 'data' && (
    typeof v === 'string' || typeof v === 'number')
  ) :
  [];

  const extracted = report ?
  extractReport(report.data) :
  { tables: [], summary: [] as [string, any][] };

  // Merge root + data summaries, de-duplicated
  const summaryMap = new Map<string, any>();
  [...rootSummary, ...extracted.summary].forEach(([k, v]) => {
    if (!summaryMap.has(k)) summaryMap.set(k, v);
  });
  const summaryEntries = Array.from(summaryMap.entries());

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
              Report
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none bg-white">
              
              {REPORTS.map((r) =>
              <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              )}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              disabled={!meta.dated}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none disabled:bg-gray-100" />
            
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              disabled={!meta.dated}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none disabled:bg-gray-100" />
            
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-[#2d4059] hover:bg-[#1a1a2e] disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-bold">
            
            {loading ?
            <Loader2 className="w-4 h-4 animate-spin" /> :

            <BarChart3 className="w-4 h-4" />
            }
            Generate
          </button>
        </div>
      </div>

      {error &&
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700 no-print">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      }

      {(report || machineReport) &&
      <div id="print-area" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-[#f5a623]" />
              <div>
                <h2 className="text-xl font-bold text-[#1a1a2e]">
                  {meta.label} Report
                </h2>
                {(startDate || endDate) && meta.dated &&
              <p className="text-xs text-gray-500">
                    {startDate || '…'} → {endDate || '…'}
                  </p>
              }
              </div>
            </div>
            <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#d4901e] text-[#1a1a2e] px-4 py-2.5 rounded-lg font-bold no-print">
            
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>

          {/* Summary cards */}
          {summaryEntries.length > 0 &&
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {summaryEntries.map(([k, v]) =>
          <div
            key={k}
            className="bg-gray-50 border border-gray-100 rounded-lg p-4">
            
                  <p className="text-xs font-medium text-gray-500">
                    {humanize(k)}
                  </p>
                  <p className="text-lg font-bold text-[#2d4059]">
                    {isMoneyKey(k) && !isNaN(Number(v)) ?
              formatPrice(Number(v)) :
              String(v)}
                  </p>
                </div>
          )}
            </div>
        }

          {/* Detail tables */}
          {extracted.tables.map((t, idx) =>
        <ReportTable key={`${t.title}-${idx}`} title={t.title} rows={t.rows} />
        )}

          {report && extracted.tables.length === 0 && summaryEntries.length === 0 &&
        <p className="text-center py-8 text-gray-400">
              No data available for this report.
            </p>
        }

          {/* Machine report */}
          {machineReport &&
        machineReport.map((group, idx) =>
        <div key={idx} className="mb-8">
                <h3 className="font-bold text-[#1a1a2e] mb-2">
                  {group.product_name}{' '}
                  <span className="text-xs font-normal text-gray-400">
                    {group.category_name}
                  </span>
                </h3>
                <ReportTable title="" rows={group.machines || []} />
              </div>
        )}

          {machineReport && machineReport.length === 0 &&
        <p className="text-center py-8 text-gray-400">
              No machine data available.
            </p>
        }
        </div>
      }

      {!report && !machineReport && !loading &&
      <div className="text-center py-16 text-gray-400">
          Select a report and click Generate.
        </div>
      }
    </div>);

}

function ReportTable({ title, rows }: {title: string;rows: Record<string, any>[];}) {
  if (!rows || rows.length === 0) {
    return title ?
    <div className="mb-6">
        <h3 className="font-bold text-[#1a1a2e] mb-2">{title}</h3>
        <p className="text-sm text-gray-400">No records.</p>
      </div> :
    null;
  }

  // Union of all keys across rows so no column is dropped
  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const isNumericColumn = (col: string) =>
  rows.every(
    (row) =>
    row[col] == null ||
    typeof row[col] !== 'boolean' && !isNaN(Number(row[col])) && String(row[col]).trim() !== ''
  );

  const formatCell = (col: string, value: any): string => {
    if (value == null || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    if (isMoneyKey(col) && !isNaN(Number(value))) return formatPrice(Number(value));
    return String(value);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {title && <h3 className="font-bold text-[#1a1a2e]">{title}</h3>}
        <span className="text-xs text-gray-400 font-medium">
          {rows.length} record{rows.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
              <th className="px-3 py-2.5 border-b border-gray-200 w-10 text-center">
                #
              </th>
              {columns.map((c) =>
              <th
                key={c}
                className={`px-3 py-2.5 border-b border-gray-200 whitespace-nowrap ${
                isNumericColumn(c) ? 'text-right' : 'text-left'}`
                }>
                
                  {humanize(c)}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) =>
            <tr
              key={i}
              className={`${i % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'} hover:bg-orange-50/40 transition-colors`}>
              
                <td className="px-3 py-2.5 text-center text-xs text-gray-400 font-mono">
                  {i + 1}
                </td>
                {columns.map((c) =>
              <td
                key={c}
                className={`px-3 py-2.5 text-gray-700 whitespace-nowrap ${
                isNumericColumn(c) ?
                'text-right font-medium tabular-nums' :
                'text-left'}`
                }>
                
                    {formatCell(c, row[c])}
                  </td>
              )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>);

}