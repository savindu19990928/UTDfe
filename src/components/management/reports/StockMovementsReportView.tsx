import { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Package,
  Users,
  Search,
  AlertTriangle,
  Layers
} from 'lucide-react';
import {
  StockMovementsReportData,
  StockMovementReportItem,
  StockMovementProductBreakdown
} from '../../../types/reports';

interface StockMovementsReportViewProps {
  data: StockMovementsReportData;
  startDate?: string;
  endDate?: string;
}

function formatStockNumber(val: string | number | null | undefined): string {
  if (val == null || val === '') return '0';
  const num =
    typeof val === 'number' ? val : Number(String(val).replace(/,/g, ''));
  if (!Number.isFinite(num)) return String(val);
  const normalized = Number(num.toFixed(6));
  return normalized === 0 ? '0' : String(normalized);
}

function parseStockNum(val: string | number | null | undefined): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (val == null || val === '') return 0;
  const num = Number(String(val).replace(/,/g, ''));
  return Number.isFinite(num) ? num : 0;
}

function formatDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

interface StaffBreakdown {
  staff_name: string;
  movements_count: number;
  stock_in: number;
  stock_out: number;
  net_change: number;
}

export function StockMovementsReportView({
  data,
  startDate,
  endDate
}: StockMovementsReportViewProps) {
  const [tableSearch, setTableSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out'>('all');

  const movements: StockMovementReportItem[] = useMemo(() => {
    return Array.isArray(data?.movements) ? data.movements : [];
  }, [data]);

  const totalMovements = data?.total_movements ?? movements.length;
  const totalStockIn = parseStockNum(data?.total_stock_in);
  const totalStockOut = parseStockNum(data?.total_stock_out);
  const netMovement =
    data?.net_movement != null
      ? parseStockNum(data.net_movement)
      : totalStockIn - totalStockOut;

  const productBreakdowns: StockMovementProductBreakdown[] = useMemo(() => {
    const map = new Map<number, StockMovementProductBreakdown>();
    movements.forEach((m) => {
      const qty = parseStockNum(m.quantity);
      const existing = map.get(m.product);
      if (!existing) {
        map.set(m.product, {
          product_id: m.product,
          product_name: m.product_name || `Product #${m.product}`,
          item_number: m.product_item_number || '',
          category_name: m.product_category_name || '',
          unit: m.product_unit || 'pcs',
          movements_count: 1,
          stock_in: m.movement_type === 'in' ? qty : 0,
          stock_out: m.movement_type === 'out' ? qty : 0,
          net_change: m.movement_type === 'in' ? qty : -qty,
          current_stock:
            m.current_stock != null ? parseStockNum(m.current_stock) : null
        });
      } else {
        existing.movements_count += 1;
        if (m.movement_type === 'in') {
          existing.stock_in += qty;
          existing.net_change += qty;
        } else {
          existing.stock_out += qty;
          existing.net_change -= qty;
        }
        if (existing.current_stock == null && m.current_stock != null) {
          existing.current_stock = parseStockNum(m.current_stock);
        }
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.stock_in + b.stock_out - (a.stock_in + a.stock_out)
    );
  }, [movements]);

  const staffBreakdowns: StaffBreakdown[] = useMemo(() => {
    const map = new Map<string, StaffBreakdown>();
    movements.forEach((m) => {
      const name = m.created_by_name?.trim() || 'Unknown';
      const qty = parseStockNum(m.quantity);
      const existing = map.get(name);
      if (!existing) {
        map.set(name, {
          staff_name: name,
          movements_count: 1,
          stock_in: m.movement_type === 'in' ? qty : 0,
          stock_out: m.movement_type === 'out' ? qty : 0,
          net_change: m.movement_type === 'in' ? qty : -qty
        });
      } else {
        existing.movements_count += 1;
        if (m.movement_type === 'in') {
          existing.stock_in += qty;
          existing.net_change += qty;
        } else {
          existing.stock_out += qty;
          existing.net_change -= qty;
        }
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.movements_count - a.movements_count
    );
  }, [movements]);

  const filteredMovements = useMemo(() => {
    let list = movements;
    if (typeFilter !== 'all') {
      list = list.filter((m) => m.movement_type === typeFilter);
    }
    const q = tableSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => {
      const target = [
        String(m.id),
        m.product_name || '',
        m.product_item_number || '',
        m.product_category_name || '',
        m.reference || '',
        m.notes || '',
        m.created_by_name || ''
      ]
        .join(' ')
        .toLowerCase();
      return target.includes(q);
    });
  }, [movements, typeFilter, tableSearch]);

  const filteredSummary = useMemo(() => {
    let stockIn = 0;
    let stockOut = 0;
    filteredMovements.forEach((m) => {
      const qty = parseStockNum(m.quantity);
      if (m.movement_type === 'in') stockIn += qty;
      else if (m.movement_type === 'out') stockOut += qty;
    });
    return {
      count: filteredMovements.length,
      stockIn,
      stockOut,
      net: stockIn - stockOut
    };
  }, [filteredMovements]);

  const periodLabel =
    startDate || endDate || data?.start_date || data?.end_date
      ? `${startDate || data?.start_date || 'Start'} → ${
          endDate || data?.end_date || 'Today'
        }`
      : 'All Dates';

  const hasActiveFilters = Boolean(
    data?.product_label ||
      data?.product_id ||
      data?.movement_type ||
      data?.search
  );

  return (
    <div className="space-y-6">
      {/* Active report filters summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
          <span className="font-bold text-slate-600 uppercase tracking-wider mr-1">
            Applied Filters:
          </span>
          {(data.product_label || data.product_id) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 font-semibold text-[#1a1a2e]">
              <Package className="w-3.5 h-3.5 text-[#f5a623]" />
              {data.product_label || `Product #${data.product_id}`}
            </span>
          )}
          {data.movement_type && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-semibold ${
                data.movement_type === 'in'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              Type: {data.movement_type === 'in' ? 'Stock In' : 'Stock Out'}
            </span>
          )}
          {data.search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 font-semibold text-slate-700">
              Search: &ldquo;{data.search}&rdquo;
            </span>
          )}
        </div>
      )}

      {/* Truncation warning if 50+ pages matched */}
      {data?.is_truncated && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-bold">Large dataset truncated to 50 pages</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Loaded {formatStockNumber(movements.length)} of{' '}
              {formatStockNumber(data.total_count ?? movements.length)} matching
              records. Narrow the date range or product filter to inspect
              everything.
            </p>
          </div>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Movements */}
        <div className="bg-[#1a1a2e] rounded-xl p-5 border border-slate-700 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#f5a623] uppercase tracking-wider">
              Total Movements
            </span>
            <div className="p-2 bg-[#f5a623]/20 text-[#f5a623] rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {formatStockNumber(totalMovements)}
          </div>
          <p className="text-xs text-slate-300 mt-1 truncate">
            {productBreakdowns.length}{' '}
            {productBreakdowns.length === 1 ? 'product' : 'products'} &bull;{' '}
            {periodLabel}
          </p>
        </div>

        {/* Total Stock In */}
        <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Total Stock In
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            +{formatStockNumber(totalStockIn)}
          </div>
          <p className="text-xs text-emerald-600/80 mt-1">
            Total quantity added to stock
          </p>
        </div>

        {/* Total Stock Out */}
        <div className="bg-white rounded-xl p-5 border border-rose-200 shadow-sm bg-gradient-to-br from-white to-rose-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Total Stock Out
            </span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">
            -{formatStockNumber(totalStockOut)}
          </div>
          <p className="text-xs text-rose-600/80 mt-1">
            Total quantity deducted from stock
          </p>
        </div>

        {/* Net Stock Change */}
        <div
          className={`bg-white rounded-xl p-5 border shadow-sm bg-gradient-to-br ${
            netMovement > 0
              ? 'border-emerald-200 from-white to-emerald-50/30'
              : netMovement < 0
              ? 'border-rose-200 from-white to-rose-50/30'
              : 'border-slate-200 from-white to-slate-50/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Net Stock Change
            </span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-black ${
              netMovement > 0
                ? 'text-emerald-700'
                : netMovement < 0
                ? 'text-rose-700'
                : 'text-slate-700'
            }`}
          >
            {netMovement > 0 ? '+' : netMovement < 0 ? '-' : ''}
            {formatStockNumber(Math.abs(netMovement))}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Stock In minus Stock Out
          </p>
        </div>
      </div>

      {/* Breakdown by Product */}
      {productBreakdowns.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#f5a623]" />
              <h3 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wider">
                Breakdown by Product ({productBreakdowns.length})
              </h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5 text-right">Movements</th>
                  <th className="px-4 py-2.5 text-right">Stock In</th>
                  <th className="px-4 py-2.5 text-right">Stock Out</th>
                  <th className="px-4 py-2.5 text-right">Net Change</th>
                  <th className="px-4 py-2.5 text-right">Current Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productBreakdowns.map((p) => (
                  <tr key={p.product_id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-[#1a1a2e]">
                        {p.product_name}
                      </div>
                      {p.item_number && (
                        <div className="text-xs text-gray-500 font-mono">
                          {p.item_number}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">
                      {p.category_name || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-700">
                      {formatStockNumber(p.movements_count)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                      +{formatStockNumber(p.stock_in)}{' '}
                      <span className="text-xs font-normal text-gray-500">
                        {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-rose-700">
                      -{formatStockNumber(p.stock_out)}{' '}
                      <span className="text-xs font-normal text-gray-500">
                        {p.unit}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-bold ${
                        p.net_change > 0
                          ? 'text-emerald-700'
                          : p.net_change < 0
                          ? 'text-rose-700'
                          : 'text-gray-700'
                      }`}
                    >
                      {p.net_change > 0 ? '+' : p.net_change < 0 ? '-' : ''}
                      {formatStockNumber(Math.abs(p.net_change))}{' '}
                      <span className="text-xs font-normal text-gray-500">
                        {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#2d4059]">
                      {p.current_stock != null ? (
                        <>
                          {formatStockNumber(p.current_stock)}{' '}
                          <span className="text-xs font-normal text-gray-500">
                            {p.unit}
                          </span>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold text-xs text-[#1a1a2e] border-t border-gray-200">
                  <td className="px-4 py-2.5" colSpan={2}>
                    Total ({productBreakdowns.length} Products)
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {formatStockNumber(movements.length)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-emerald-700">
                    +{formatStockNumber(
                      productBreakdowns.reduce((s, p) => s + p.stock_in, 0)
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-rose-700">
                    -{formatStockNumber(
                      productBreakdowns.reduce((s, p) => s + p.stock_out, 0)
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {(() => {
                      const net = productBreakdowns.reduce(
                        (s, p) => s + p.net_change,
                        0
                      );
                      return `${net > 0 ? '+' : net < 0 ? '-' : ''}${formatStockNumber(
                        Math.abs(net)
                      )}`;
                    })()}
                  </td>
                  <td className="px-4 py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Breakdown by Staff User */}
      {staffBreakdowns.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wider">
              Breakdown by Staff User ({staffBreakdowns.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="px-4 py-2.5">Recorded By</th>
                  <th className="px-4 py-2.5 text-right">Movements</th>
                  <th className="px-4 py-2.5 text-right">Stock In</th>
                  <th className="px-4 py-2.5 text-right">Stock Out</th>
                  <th className="px-4 py-2.5 text-right">Net Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffBreakdowns.map((u) => (
                  <tr key={u.staff_name} className="hover:bg-gray-50/70">
                    <td className="px-4 py-2.5 font-semibold text-[#1a1a2e]">
                      {u.staff_name}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-700">
                      {formatStockNumber(u.movements_count)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                      +{formatStockNumber(u.stock_in)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-rose-700">
                      -{formatStockNumber(u.stock_out)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-bold ${
                        u.net_change > 0
                          ? 'text-emerald-700'
                          : u.net_change < 0
                          ? 'text-rose-700'
                          : 'text-gray-700'
                      }`}
                    >
                      {u.net_change > 0 ? '+' : u.net_change < 0 ? '-' : ''}
                      {formatStockNumber(Math.abs(u.net_change))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Stock Movements Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wider">
              Stock Movements ({filteredMovements.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filter rows by product, ref, user..."
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#f5a623] outline-none w-56"
              />
            </div>

            <div className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1.5 transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-[#2d4059] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('in')}
                className={`px-2.5 py-1.5 border-l border-gray-300 transition-colors ${
                  typeFilter === 'in'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Stock In
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('out')}
                className={`px-2.5 py-1.5 border-l border-gray-300 transition-colors ${
                  typeFilter === 'out'
                    ? 'bg-rose-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Stock Out
              </button>
            </div>
          </div>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">
            No stock movements match the selected period or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">ID</th>
                  <th className="px-3 py-2.5">Date &amp; Time</th>
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5 text-right">Quantity</th>
                  <th className="px-3 py-2.5 text-right">Current Stock</th>
                  <th className="px-3 py-2.5">Reference &amp; Notes</th>
                  <th className="px-3 py-2.5">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMovements.map((m, idx) => {
                  const isIn = m.movement_type === 'in';
                  const unit = m.product_unit || 'pcs';
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/70">
                      <td className="px-3 py-2.5 text-xs text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-600">
                        #{m.id}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-[#1a1a2e]">
                          {m.product_name}
                        </div>
                        <div className="text-xs text-gray-500 flex flex-wrap gap-1.5">
                          {m.product_item_number && (
                            <span className="font-mono">
                              {m.product_item_number}
                            </span>
                          )}
                          {m.product_category_name && (
                            <span>&bull; {m.product_category_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {isIn ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            <ArrowDownLeft className="w-3 h-3" /> Stock In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                            <ArrowUpRight className="w-3 h-3" /> Stock Out
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${
                          isIn ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isIn ? '+' : '-'}
                        {formatStockNumber(m.quantity)}{' '}
                        <span className="text-xs font-normal text-gray-500">
                          {unit}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[#2d4059] whitespace-nowrap">
                        {m.current_stock != null ? (
                          <>
                            {formatStockNumber(m.current_stock)}{' '}
                            <span className="text-xs font-normal text-gray-500">
                              {unit}
                            </span>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-700 max-w-xs">
                        {m.reference && (
                          <div className="font-semibold text-[#1a1a2e] truncate">
                            {m.reference}
                          </div>
                        )}
                        {m.notes && (
                          <div className="text-gray-500 line-clamp-2">
                            {m.notes}
                          </div>
                        )}
                        {!m.reference && !m.notes && (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-gray-700 whitespace-nowrap">
                        {m.created_by_name || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold text-xs text-[#1a1a2e] border-t border-gray-200">
                  <td className="px-3 py-2.5" colSpan={5}>
                    Showing {filteredSummary.count} movement
                    {filteredSummary.count === 1 ? '' : 's'}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <span className="text-emerald-700">
                      +{formatStockNumber(filteredSummary.stockIn)}
                    </span>
                    {' / '}
                    <span className="text-rose-700">
                      -{formatStockNumber(filteredSummary.stockOut)}
                    </span>
                    {' (Net: '}
                    {filteredSummary.net > 0
                      ? '+'
                      : filteredSummary.net < 0
                      ? '-'
                      : ''}
                    {formatStockNumber(Math.abs(filteredSummary.net))}
                    {')'}
                  </td>
                  <td className="px-3 py-2.5" colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
