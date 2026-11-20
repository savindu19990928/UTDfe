import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Loader2,
  AlertTriangle,
  Download,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';
import {
  SearchableSelect,
  SearchableSelectOption
} from '../SearchableSelect';
import { useReports, ReportType } from '../../hooks/useReports';
import { useProducts } from '../../hooks/useProducts';
import { formatPrice } from '../../utils/format';
import { API_URL } from '../../utils/config';
import { getAuthHeaders, isSuperUser } from '../../utils/auth';
import { ClosedBillsReportView } from './reports/ClosedBillsReportView';
import { FinancialReportView } from './reports/FinancialReportView';
import { OpenedBillsReportView } from './reports/OpenedBillsReportView';
import { UnsettledBillsReportView } from './reports/UnsettledBillsReportView';
import { RentedItemsReportView } from './reports/RentedItemsReportView';
import { HeldDocumentsReportView } from './reports/HeldDocumentsReportView';
import { ExpensesReportView } from './reports/ExpensesReportView';
import { SingleMachineHistoryReportView } from './reports/SingleMachineHistoryReportView';
import { StockMovementsReportView } from './reports/StockMovementsReportView';
import { AuditLogReportView } from './reports/AuditLogReportView';
import {
  exportFinancialReportToExcel,
  exportOpenedBillsReportToExcel,
  exportUnsettledBillsReportToExcel,
  exportClosedBillsReportToExcel,
  exportGenericReportToExcel,
  exportMachineReportToExcel,
  exportRentedItemsReportToExcel,
  exportHeldDocumentsReportToExcel,
  exportExpensesReportToExcel,
  exportSingleMachineHistoryReportToExcel,
  exportStockMovementsReportToExcel,
  exportAuditLogReportToExcel
} from '../../utils/excelExport';

function formatStockNumber(val: string | number | null | undefined): string {
  if (val == null || val === '') return '0';
  const num =
    typeof val === 'number' ? val : Number(String(val).replace(/,/g, ''));
  if (!Number.isFinite(num)) return String(val);
  const normalized = Number(num.toFixed(6));
  return normalized === 0 ? '0' : String(normalized);
}

interface MachineOption {
  machineId: number;
  machineNumber: string;
  productId?: number;
  productName: string;
  categoryName?: string;
}

const REPORTS: {
  value: ReportType;
  label: string;
  hasStartDate: boolean;
  hasEndDate: boolean;
  adminOnly?: boolean;
}[] = [
  {
    value: 'financial',
    label: 'Financial Report',
    hasStartDate: true,
    hasEndDate: true
  },
  {
    value: 'expenses',
    label: 'Expenses Report',
    hasStartDate: true,
    hasEndDate: true
  },
  {
    value: 'opened_bills',
    label: 'Opened Bills Report',
    hasStartDate: false,
    hasEndDate: true
  },
  {
    value: 'unsettled_bills',
    label: 'Payment Unsettled Bills Report',
    hasStartDate: false,
    hasEndDate: true
  },
  {
    value: 'closed_bills',
    label: 'Closed Bills Report',
    hasStartDate: true,
    hasEndDate: true
  },
  {
    value: 'rented_items',
    label: 'Rented Items Report',
    hasStartDate: false,
    hasEndDate: true
  },
  {
    value: 'held_documents',
    label: 'Customer Held Documents Report',
    hasStartDate: false,
    hasEndDate: false
  },
  {
    value: 'stock_all',
    label: 'Stock — All',
    hasStartDate: false,
    hasEndDate: false
  },
  {
    value: 'stock_sales',
    label: 'Stock — Sales',
    hasStartDate: false,
    hasEndDate: false
  },
  {
    value: 'stock_rentals',
    label: 'Stock — Rentals',
    hasStartDate: false,
    hasEndDate: false
  },
  {
    value: 'stock_movements',
    label: 'Stock Movement Report',
    hasStartDate: true,
    hasEndDate: true
  },
  {
    value: 'damaged',
    label: 'Damaged Items',
    hasStartDate: true,
    hasEndDate: true
  },
  {
    value: 'customers',
    label: 'Customers',
    hasStartDate: true,
    hasEndDate: true
  },
  {
    value: 'banned',
    label: 'Banned Customers',
    hasStartDate: true,
    hasEndDate: true
  },
  {
    value: 'machines',
    label: 'Machine Usage',
    hasStartDate: false,
    hasEndDate: false
  },
  {
    value: 'machine_history',
    label: 'Single Machine Usage Report',
    hasStartDate: true,
    hasEndDate: true
  },
  {
    value: 'audit_log',
    label: 'Auditlog',
    hasStartDate: true,
    hasEndDate: true,
    adminOnly: true
  }
];

const AUDIT_CATEGORIES: { value: string; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'auth', label: 'Authentication & Login' },
  { value: 'user', label: 'User Management' },
  { value: 'category', label: 'Product Categories' },
  { value: 'product', label: 'Products' },
  { value: 'machine', label: 'Machines' },
  { value: 'stock', label: 'Stock Movements' },
  { value: 'damaged', label: 'Damaged Products' },
  { value: 'customer', label: 'Customers' },
  { value: 'sale', label: 'Sales & Bills' },
  { value: 'rental', label: 'Rentals & Returns' },
  { value: 'cash_register', label: 'Cash Register & Shifts' },
  { value: 'expense', label: 'Expenses' },
  { value: 'report', label: 'Reports' },
  { value: 'other', label: 'Other System Actions' }
];

interface AuditUserOption {
  id: number;
  username: string;
  fullName: string;
  role: 'Admin' | 'Cashier';
  phoneNumber?: string;
}

// Columns that are intentionally omitted from a report's detail tables.
// Keys are matched loosely (case and separators ignored) since the tables are
// built straight from whatever the API returns.
const HIDDEN_COLUMNS: Partial<Record<ReportType, string[]>> = {
  financial: ['transaction_type'],
  closed_bills: [
    'detailed_bills',
    'rental_fee_raw',
    'fines_raw',
    'income_raw',
    'refunds_raw',
    'profit_raw',
    'closed_bill_profit_raw'
  ],
  opened_bills: [
    'detailed_bills',
    'rental_fee_raw',
    'fines_raw',
    'income_raw',
    'charged_amount_raw',
    'deposit_raw',
    'deposit_taken_raw'
  ],
  unsettled_bills: [
    'detailed_bills',
    'rental_fee_raw',
    'fines_raw',
    'income_raw',
    'charged_amount_raw',
    'deposit_raw',
    'deposit_taken_raw',
    'refunds_raw',
    'remaining_deposit_raw',
    'unsettled_amount_raw',
    'amount_owed_raw',
    'due_amount_raw'
  ]
};

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isMoneyKey(key: string): boolean {
  if (
    /times|count|qty|quantity|stock|days|hours|minutes|number|rate|percent|rented/i.test(
      key
    )
  ) {
    return false;
  }
  return /income|profit|expense|amount|total|price|deposit|fine|value|refund|due|owed/i.test(
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
              flat[k] = v
                .map((x) => (isPlainObject(x) ? JSON.stringify(x) : String(x)))
                .join(', ');
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
        ([, v]) =>
          typeof v === 'string' ||
          typeof v === 'number' ||
          typeof v === 'boolean'
      );

      if (
        entries.length > 0 &&
        objectValues.length === entries.length &&
        entries.length > 1
      ) {
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
      scalarValues.forEach(([k, v]) => {
        if (
          k !== 'start_date' &&
          k !== 'end_date' &&
          k !== 'total closed bill profit'
        ) {
          addSummary(k, v);
        }
      });
      arrayValues.forEach(([k, v]) => walk(v, humanize(k)));
      objectValues.forEach(([k, v]) => walk(v, humanize(k)));
      return;
    }
  };

  walk(data, 'Records');
  return { tables, summary };
}

export function ReportsPage() {
  const isAdmin = isSuperUser();
  const { loading, error, report, machineReport, fetchReport } = useReports();
  const [reportType, setReportType] = useState<ReportType>('financial');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State for Single Machine Usage Report (report_type=machine_history)
  const [machineOptions, setMachineOptions] = useState<MachineOption[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [machineNumberInput, setMachineNumberInput] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // State for Stock Movement Report
  const [stockMovementProductId, setStockMovementProductId] = useState<string>('');
  const [stockMovementProductLabel, setStockMovementProductLabel] = useState<string>('');
  const [stockMovementProductSearch, setStockMovementProductSearch] = useState<string>('');
  const [stockMovementType, setStockMovementType] = useState<'' | 'in' | 'out'>('');
  const [stockMovementSearch, setStockMovementSearch] = useState<string>('');

  // State for Auditlog Report (report_type=audit_log)
  const [auditUsers, setAuditUsers] = useState<AuditUserOption[]>([]);
  const [auditUsersLoading, setAuditUsersLoading] = useState(false);
  const [selectedAuditUserId, setSelectedAuditUserId] = useState<string>('');
  const [selectedAuditCategory, setSelectedAuditCategory] = useState<string>('');

  useEffect(() => {
    if (
      (reportType !== 'audit_log' &&
        reportType !== 'user_history' &&
        reportType !== 'all_users_history') ||
      auditUsers.length > 0 ||
      !isAdmin
    ) {
      return;
    }
    let cancelled = false;
    const loadAuditUsers = async () => {
      setAuditUsersLoading(true);
      try {
        const res = await fetch(`${API_URL}users/?page_size=100`, {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            const rawList: any[] = Array.isArray(json)
              ? json
              : json.results || [];
            const list: AuditUserOption[] = rawList.map((u) => {
              const role: 'Admin' | 'Cashier' =
                u.is_superuser || u.role === 'superuser' ? 'Admin' : 'Cashier';
              const fullName =
                [u.first_name, u.last_name].filter(Boolean).join(' ') ||
                u.username;
              return {
                id: Number(u.id),
                username: String(u.username),
                fullName,
                role,
                phoneNumber: u.phone_number || undefined
              };
            });
            setAuditUsers(list);
          }
        }
      } catch (err) {
        console.warn('Could not preload audit users:', err);
      } finally {
        if (!cancelled) setAuditUsersLoading(false);
      }
    };
    loadAuditUsers();
    return () => {
      cancelled = true;
    };
  }, [reportType, auditUsers.length, isAdmin]);

  const auditUserSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'All Users (Everyone)' },
      ...auditUsers.map((u) => ({
        value: String(u.id),
        label: `${u.username} — ${u.fullName} (${u.role})`,
        sublabel: u.phoneNumber ? `Phone: ${u.phoneNumber}` : undefined,
        searchText: `${u.username} ${u.fullName} ${u.role} ${u.phoneNumber || ''} ${u.id}`
      }))
    ];
  }, [auditUsers]);

  const { products: stockProducts, loading: stockProductsLoading } = useProducts({
    search: stockMovementProductSearch.trim() || undefined,
    includeDeactivated: true,
    enabled: reportType === 'stock_movements'
  });

  const stockProductSelectOptions: SearchableSelectOption[] = useMemo(() => {
    const opts: SearchableSelectOption[] = [
      { value: '', label: 'All Products' },
      ...stockProducts.map((p) => ({
        value: p.id,
        label: `${p.name}${p.itemCode ? ` (${p.itemCode})` : ''}`,
        sublabel: `Current Stock: ${formatStockNumber(p.stock)} ${p.unit || 'pcs'}`,
        searchText: `${p.name} ${p.itemCode || ''} ${p.barcode || ''} ${p.category || ''}`
      }))
    ];
    if (
      stockMovementProductId &&
      !stockProducts.some((p) => p.id === stockMovementProductId)
    ) {
      opts.splice(1, 0, {
        value: stockMovementProductId,
        label: stockMovementProductLabel || `Product #${stockMovementProductId}`
      });
    }
    return opts;
  }, [stockProducts, stockMovementProductId, stockMovementProductLabel]);

  useEffect(() => {
    if (reportType !== 'machine_history' || machineOptions.length > 0) return;
    let cancelled = false;
    const loadMachines = async () => {
      setMachinesLoading(true);
      try {
        const res = await fetch(`${API_URL}machine-report/`, {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const groups = await res.json();
          if (!cancelled && Array.isArray(groups)) {
            const list: MachineOption[] = [];
            groups.forEach((g: any) => {
              (g.machines || []).forEach((m: any) => {
                list.push({
                  machineId: Number(m.machine_id ?? m.id),
                  machineNumber: String(m.machine_number || ''),
                  productId: g.product_id != null ? Number(g.product_id) : undefined,
                  productName: g.product_name || '',
                  categoryName: g.category_name || ''
                });
              });
            });
            setMachineOptions(list);
          }
        }
      } catch (err) {
        console.warn('Could not preload machine list:', err);
      } finally {
        if (!cancelled) setMachinesLoading(false);
      }
    };
    loadMachines();
    return () => {
      cancelled = true;
    };
  }, [reportType, machineOptions.length]);

  const productOptionsForMachines = useMemo(() => {
    const map = new Map<number, string>();
    machineOptions.forEach((m) => {
      if (m.productId != null && !map.has(m.productId)) {
        map.set(m.productId, m.productName);
      }
    });
    return Array.from(map.entries());
  }, [machineOptions]);

  const filteredMachineOptions = useMemo(() => {
    if (!selectedProductId) return machineOptions;
    return machineOptions.filter(
      (m) => String(m.productId) === selectedProductId
    );
  }, [machineOptions, selectedProductId]);

  const productSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'All Rental Products' },
      ...productOptionsForMachines.map(([id, name]) => ({
        value: String(id),
        label: `${name} (#${id})`,
        searchText: `${name} ${id}`
      }))
    ];
  }, [productOptionsForMachines]);

  const machineSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: '-- Select a Machine or enter Machine No --' },
      ...filteredMachineOptions.map((m) => ({
        value: String(m.machineId),
        label: `${m.machineNumber} — ${m.productName} (ID: #${m.machineId})`,
        sublabel: m.categoryName ? `Category: ${m.categoryName}` : undefined,
        searchText: `${m.machineNumber} ${m.productName} ${m.machineId} ${m.categoryName || ''}`
      }))
    ];
  }, [filteredMachineOptions]);

  const availableReports = useMemo(() => {
    return REPORTS.filter((r) => !r.adminOnly || isAdmin);
  }, [isAdmin]);

  const meta =
    availableReports.find((r) => r.value === reportType) ??
    availableReports[0] ??
    REPORTS[0];
  const activeReportType =
    ((report?.report_type as ReportType) || reportType);
  const activeMeta =
    REPORTS.find((r) => r.value === activeReportType) ?? meta;

  const isDateOnly = !meta.hasStartDate && meta.hasEndDate;

  const handleGenerate = () => {
    fetchReport(
      reportType,
      meta.hasStartDate ? startDate || undefined : undefined,
      meta.hasEndDate ? endDate || undefined : undefined,
      reportType === 'machine_history'
        ? {
            machineId: selectedMachineId || undefined,
            machineNumber: !selectedMachineId
              ? machineNumberInput.trim() || undefined
              : undefined,
            productId: selectedProductId || undefined
          }
        : reportType === 'stock_movements'
        ? {
            productId: stockMovementProductId || undefined,
            productLabel: stockMovementProductLabel || undefined,
            movementType: stockMovementType || undefined,
            search: stockMovementSearch.trim() || undefined
          }
        : reportType === 'audit_log'
        ? {
            userId: selectedAuditUserId || undefined,
            category: selectedAuditCategory || undefined
          }
        : undefined
    );
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (machineReport && reportType === 'machines') {
      exportMachineReportToExcel(machineReport);
      return;
    }
    if (!report) return;

    if (activeReportType === 'financial') {
      exportFinancialReportToExcel(
        report.data as any,
        startDate || report.start_date,
        endDate || report.end_date
      );
    } else if (activeReportType === 'expenses') {
      exportExpensesReportToExcel(
        report.data as any,
        startDate || report.start_date,
        endDate || report.end_date
      );
    } else if (activeReportType === 'opened_bills') {
      exportOpenedBillsReportToExcel(
        report.data as any,
        endDate || report.end_date
      );
    } else if (activeReportType === 'unsettled_bills') {
      exportUnsettledBillsReportToExcel(
        report.data as any,
        endDate || report.end_date
      );
    } else if (activeReportType === 'closed_bills') {
      exportClosedBillsReportToExcel(
        report.data as any,
        startDate || report.start_date,
        endDate || report.end_date
      );
    } else if (activeReportType === 'rented_items') {
      exportRentedItemsReportToExcel(
        report.data as any,
        endDate || report.end_date
      );
    } else if (activeReportType === 'held_documents') {
      exportHeldDocumentsReportToExcel(
        report.data as any,
        endDate || report.end_date
      );
    } else if (activeReportType === 'machine_history') {
      exportSingleMachineHistoryReportToExcel(
        report.data as any,
        startDate || report.start_date,
        endDate || report.end_date
      );
    } else if (activeReportType === 'stock_movements') {
      exportStockMovementsReportToExcel(
        report.data as any,
        startDate || report.start_date,
        endDate || report.end_date
      );
    } else if (
      activeReportType === 'audit_log' ||
      activeReportType === 'user_history' ||
      activeReportType === 'all_users_history'
    ) {
      exportAuditLogReportToExcel(
        report.data as any,
        activeReportType,
        startDate || report.start_date,
        endDate || report.end_date
      );
    } else {
      const dateStr = activeMeta.hasStartDate
        ? `${startDate || report.start_date || 'all'}_to_${endDate || report.end_date || 'today'}`
        : `${endDate || report.end_date || 'snapshot'}`;
      exportGenericReportToExcel(
        activeReportType,
        activeMeta.label,
        summaryEntries,
        extracted.tables,
        dateStr
      );
    }
  };

  // Root-level scalar values (e.g. total_profit next to `data`)
  const rootSummary: [string, any][] = report
    ? Object.entries(report as Record<string, any>).filter(
        ([k, v]) =>
          k !== 'report_type' &&
          k !== 'start_date' &&
          k !== 'end_date' &&
          k !== 'data' &&
          (typeof v === 'string' || typeof v === 'number')
      )
    : [];

  const extracted = report
    ? extractReport(report.data)
    : { tables: [], summary: [] as [string, any][] };

  // Merge root + data summaries, de-duplicated
  const summaryMap = new Map<string, any>();
  [...rootSummary, ...extracted.summary].forEach(([k, v]) => {
    if (!summaryMap.has(k)) summaryMap.set(k, v);
  });
  const summaryEntries = Array.from(summaryMap.entries());

  const customViews: ReportType[] = [
    'financial',
    'expenses',
    'opened_bills',
    'unsettled_bills',
    'closed_bills',
    'rented_items',
    'held_documents',
    'machine_history',
    'stock_movements',
    'audit_log',
    'user_history',
    'all_users_history'
  ];

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6 no-print">
        <div
          className={`grid grid-cols-1 ${
            isDateOnly ? 'md:grid-cols-3' : 'md:grid-cols-4'
          } gap-4 items-end`}
        >
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
              Report
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none bg-white"
            >
              {availableReports.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {!isDateOnly && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                disabled={!meta.hasStartDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none disabled:bg-gray-100"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
              {isDateOnly ? 'Date' : 'End Date'}
            </label>
            <input
              type="date"
              value={endDate}
              disabled={!meta.hasEndDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none disabled:bg-gray-100"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-[#2d4059] hover:bg-[#1a1a2e] disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-bold"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4" />
            )}
            Generate
          </button>
        </div>

        {/* Additional parameters for Single Machine Usage Report */}
        {reportType === 'machine_history' && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Filter by Product (Optional)
              </label>
              <SearchableSelect
                value={selectedProductId}
                onChange={(val) => {
                  setSelectedProductId(val);
                  setSelectedMachineId('');
                }}
                options={productSelectOptions}
                placeholder="All Rental Products"
                searchPlaceholder="Search product name or ID..."
                emptyText="No matching products found"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Select Machine {machinesLoading ? '(Loading...)' : ''}
              </label>
              <SearchableSelect
                value={selectedMachineId}
                onChange={(val) => {
                  setSelectedMachineId(val);
                  if (val) {
                    const match = machineOptions.find(
                      (m) => String(m.machineId) === val
                    );
                    if (match) {
                      setMachineNumberInput(match.machineNumber);
                    }
                  }
                }}
                options={machineSelectOptions}
                placeholder="-- Select a Machine or enter Machine No --"
                searchPlaceholder="Search machine no, product, or ID..."
                emptyText="No matching machines found"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Or Enter Machine Number
              </label>
              <input
                type="text"
                placeholder="e.g. DR-001 or 00001"
                value={machineNumberInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setMachineNumberInput(val);
                  setSelectedMachineId('');
                }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none text-sm font-mono"
              />
            </div>
          </div>
        )}

        {/* Additional parameters for Stock Movement Report */}
        {reportType === 'stock_movements' && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Filter by Product {stockProductsLoading ? '(Loading...)' : '(Optional)'}
              </label>
              <SearchableSelect
                value={stockMovementProductId}
                onChange={(val) => {
                  setStockMovementProductId(val);
                  if (!val) {
                    setStockMovementProductLabel('');
                  } else {
                    const matched = stockProductSelectOptions.find(
                      (o) => o.value === val
                    );
                    if (matched) setStockMovementProductLabel(matched.label);
                  }
                }}
                onSearchChange={setStockMovementProductSearch}
                options={stockProductSelectOptions}
                placeholder="All Products"
                searchPlaceholder="Search product name, item code, barcode..."
                emptyText="No matching products found"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Movement Type (Optional)
              </label>
              <select
                value={stockMovementType}
                onChange={(e) =>
                  setStockMovementType(e.target.value as '' | 'in' | 'out')
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none bg-white text-sm"
              >
                <option value="">All Movements</option>
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Search Reference / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="Invoice #, supplier, reference, notes..."
                value={stockMovementSearch}
                onChange={(e) => setStockMovementSearch(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none text-sm"
              />
            </div>
          </div>
        )}

        {/* Additional parameters for Auditlog Report */}
        {reportType === 'audit_log' && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Filter by User {auditUsersLoading ? '(Loading...)' : '(Optional)'}
              </label>
              <SearchableSelect
                value={selectedAuditUserId}
                onChange={setSelectedAuditUserId}
                options={auditUserSelectOptions}
                placeholder="All Users (Everyone)"
                searchPlaceholder="Search username, name, role (Admin/Cashier)..."
                emptyText="No matching users found"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Filter by Category (Optional)
              </label>
              <select
                value={selectedAuditCategory}
                onChange={(e) => setSelectedAuditCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none bg-white text-sm"
              >
                {AUDIT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700 no-print">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {(report || machineReport) && (
        <div
          id="print-area"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-[#f5a623]" />
              <div>
                <h2 className="text-xl font-bold text-[#1a1a2e]">
                  {activeMeta.label.endsWith('Report')
                    ? activeMeta.label
                    : `${activeMeta.label} Report`}
                </h2>
                {!activeMeta.hasStartDate && activeMeta.hasEndDate && (
                  <p className="text-xs text-gray-500">
                    {endDate || report?.end_date || 'Today'}
                  </p>
                )}
                {activeMeta.hasStartDate &&
                  activeMeta.hasEndDate &&
                  (startDate || endDate || report?.start_date || report?.end_date) && (
                    <p className="text-xs text-gray-500">
                      {startDate || report?.start_date || '…'} →{' '}
                      {endDate || report?.end_date || '…'}
                    </p>
                  )}
              </div>
            </div>
            <div className="flex items-center gap-2 no-print">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 bg-[#2d4059] hover:bg-[#1a1a2e] text-white px-4 py-2.5 rounded-lg font-bold"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#f5a623]" /> Export Excel
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#d4901e] text-[#1a1a2e] px-4 py-2.5 rounded-lg font-bold"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>

          {/* Financial Report View */}
          {report && activeReportType === 'financial' && (
            <FinancialReportView
              data={report.data as any}
              startDate={startDate || report.start_date}
              endDate={endDate || report.end_date}
            />
          )}

          {/* Opened Bills Report View */}
          {report && activeReportType === 'opened_bills' && (
            <OpenedBillsReportView
              data={report.data as any}
              endDate={endDate || report.end_date}
            />
          )}

          {/* Payment Unsettled Bills Report View */}
          {report && activeReportType === 'unsettled_bills' && (
            <UnsettledBillsReportView
              data={report.data as any}
              endDate={endDate || report.end_date}
            />
          )}

          {/* Closed Bills Report View */}
          {report && activeReportType === 'closed_bills' && (
            <ClosedBillsReportView
              data={report.data as any}
              startDate={startDate || report.start_date}
              endDate={endDate || report.end_date}
            />
          )}

          {/* Rented Items Report View */}
          {report && activeReportType === 'rented_items' && (
            <RentedItemsReportView
              data={report.data as any}
              endDate={endDate || report.end_date}
            />
          )}

          {/* Customer Held Documents Report View */}
          {report && activeReportType === 'held_documents' && (
            <HeldDocumentsReportView
              data={report.data as any}
              endDate={endDate || report.end_date}
            />
          )}

          {/* Expenses Report View */}
          {report && activeReportType === 'expenses' && (
            <ExpensesReportView
              data={report.data as any}
              startDate={startDate || report.start_date}
              endDate={endDate || report.end_date}
            />
          )}

          {/* Single Machine Usage / History Report View */}
          {report && activeReportType === 'machine_history' && (
            <SingleMachineHistoryReportView
              data={report.data as any}
              startDate={startDate || report.start_date}
              endDate={endDate || report.end_date}
            />
          )}

          {/* Stock Movement Report View */}
          {report && activeReportType === 'stock_movements' && (
            <StockMovementsReportView
              data={report.data as any}
              startDate={startDate || report.start_date}
              endDate={endDate || report.end_date}
            />
          )}

          {/* Auditlog / User Action History Report View */}
          {report &&
            (activeReportType === 'audit_log' ||
              activeReportType === 'user_history' ||
              activeReportType === 'all_users_history') && (
              <AuditLogReportView
                data={report.data as any}
                reportType={report.report_type}
                startDate={startDate || report.start_date}
                endDate={endDate || report.end_date}
              />
            )}

          {/* Generic view for all other reports */}
          {report && !customViews.includes(activeReportType) && (
            <>
              {/* Summary cards */}
              {summaryEntries.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {summaryEntries.map(([k, v]) => (
                    <div
                      key={k}
                      className="bg-gray-50 border border-gray-100 rounded-lg p-4"
                    >
                      <p className="text-xs font-medium text-gray-500">
                        {humanize(k)}
                      </p>
                      <p className="text-lg font-bold text-[#2d4059]">
                        {isMoneyKey(k) && !isNaN(Number(v))
                          ? formatPrice(Number(v))
                          : /times|count|qty|quantity/i.test(k) &&
                            !isNaN(Number(v))
                          ? String(Number(v))
                          : String(v)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Detail tables */}
              {extracted.tables.map((t, idx) => (
                <ReportTable
                  key={`${t.title}-${idx}`}
                  title={t.title}
                  rows={t.rows}
                  hiddenColumns={HIDDEN_COLUMNS[activeReportType]}
                />
              ))}

              {extracted.tables.length === 0 && summaryEntries.length === 0 && (
                <p className="text-center py-8 text-gray-400">
                  No data available for this report.
                </p>
              )}
            </>
          )}

          {/* Machine report */}
          {machineReport &&
            machineReport.map((group, idx) => (
              <div key={idx} className="mb-8">
                <h3 className="font-bold text-[#1a1a2e] mb-2">
                  {group.product_name}{' '}
                  <span className="text-xs font-normal text-gray-400">
                    {group.category_name}
                  </span>
                </h3>
                <ReportTable title="" rows={group.machines || []} />
              </div>
            ))}

          {machineReport && machineReport.length === 0 && (
            <p className="text-center py-8 text-gray-400">
              No machine data available.
            </p>
          )}
        </div>
      )}

      {!report && !machineReport && !loading && (
        <div className="text-center py-16 text-gray-400">
          Select a report and click Generate.
        </div>
      )}
    </div>
  );
}

function ReportTable({
  title,
  rows,
  hiddenColumns
}: {
  title: string;
  rows: Record<string, any>[];
  hiddenColumns?: string[];
}) {
  if (!rows || rows.length === 0) {
    return title ? (
      <div className="mb-6">
        <h3 className="font-bold text-[#1a1a2e] mb-2">{title}</h3>
        <p className="text-sm text-gray-400">No records.</p>
      </div>
    ) : null;
  }

  // Union of all keys across rows so no column is dropped
  const hidden = new Set((hiddenColumns ?? []).map(normalizeKey));
  const columns = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  ).filter((c) => !hidden.has(normalizeKey(c)));

  const isNumericColumn = (col: string) =>
    rows.every(
      (row) =>
        row[col] == null ||
        (typeof row[col] !== 'boolean' &&
          !isNaN(Number(row[col])) &&
          String(row[col]).trim() !== '')
    );

  const formatCell = (col: string, value: any): string => {
    if (value == null || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    if (isMoneyKey(col) && !isNaN(Number(value)))
      return formatPrice(Number(value));
    if (/times|count|qty|quantity/i.test(col) && !isNaN(Number(value))) {
      return String(Number(value));
    }
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
              {columns.map((c) => (
                <th
                  key={c}
                  className={`px-3 py-2.5 border-b border-gray-200 whitespace-nowrap ${
                    isNumericColumn(c) ? 'text-right' : 'text-left'
                  }`}
                >
                  {humanize(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`${
                  i % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                } hover:bg-orange-50/40 transition-colors`}
              >
                <td className="px-3 py-2.5 text-center text-xs text-gray-400 font-mono">
                  {i + 1}
                </td>
                {columns.map((c) => (
                  <td
                    key={c}
                    className={`px-3 py-2.5 text-gray-700 whitespace-nowrap ${
                      isNumericColumn(c)
                        ? 'text-right font-medium tabular-nums'
                        : 'text-left'
                    }`}
                  >
                    {formatCell(c, row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
