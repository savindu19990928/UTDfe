import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  TrendingUp,
  RotateCcw,
  Wallet,
  Receipt,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  PackageCheck
} from 'lucide-react';
import { ClosedBillsReportData, ClosedBill } from '../../../types/reports';
import { formatPrice } from '../../../utils/format';

interface ClosedBillsReportViewProps {
  data: ClosedBillsReportData;
  startDate?: string;
  endDate?: string;
}

function parseRaw(rawVal: number | undefined, formattedVal: string | number | undefined): number {
  if (typeof rawVal === 'number' && !isNaN(rawVal)) return rawVal;
  if (typeof formattedVal === 'number' && !isNaN(formattedVal)) return formattedVal;
  if (formattedVal == null || formattedVal === '') return 0;
  return parseFloat(String(formattedVal).replace(/[^0-9.-]/g, '')) || 0;
}

export function ClosedBillsReportView({
  data,
  startDate,
  endDate
}: ClosedBillsReportViewProps) {
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const bills: ClosedBill[] = useMemo(() => {
    return Array.isArray(data?.bills)
      ? data.bills
      : Array.isArray(data?.detailed_bills)
      ? data.detailed_bills
      : [];
  }, [data]);

  const filteredBills = useMemo(() => {
    if (!search.trim()) return bills;
    const q = search.toLowerCase().trim();
    return bills.filter((b) => {
      const billNo = (b.bill_number || '').toLowerCase();
      const customer = (b.customer || '').toLowerCase();
      const nic = (b.customer_nic || '').toLowerCase();
      const mobile = (b.customer_mobile || '').toLowerCase();
      return (
        billNo.includes(q) ||
        customer.includes(q) ||
        nic.includes(q) ||
        mobile.includes(q)
      );
    });
  }, [bills, search]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (expandedIds.size === filteredBills.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredBills.map((b) => b.id)));
    }
  };

  // Filtered totals
  const filteredTotals = useMemo(() => {
    return filteredBills.reduce(
      (acc, b) => {
        const fee = parseRaw(b.rental_fee_raw, b.rental_fee);
        const fines = parseRaw(b.fines_raw, b.fines);
        const inc = parseRaw(b.income_raw, b.income);
        const ref = parseRaw(b.refunds_raw, b.refunds);
        const closedProfit = parseRaw(
          b.closed_bill_profit_raw ?? b.profit_raw,
          b.closed_bill_profit ?? b.profit
        );
        return {
          fee: acc.fee + fee,
          fines: acc.fines + fines,
          income: acc.income + inc,
          refunds: acc.refunds + ref,
          closedProfit: acc.closedProfit + closedProfit
        };
      },
      { fee: 0, fines: 0, income: 0, refunds: 0, closedProfit: 0 }
    );
  }, [filteredBills]);

  const totalCount = data.closed_bills_count ?? bills.length;
  const closedBillProfitRaw =
    data.closed_bill_profit ?? data.total_closed_bill_profit ?? data.total_profit;
  const totalClosedProfitNum = parseRaw(undefined, closedBillProfitRaw);
  const totalClosedProfitFormatted =
    data.closed_bill_profit_formatted ||
    data.total_closed_bill_profit_formatted ||
    data.total_profit_formatted ||
    formatPrice(totalClosedProfitNum);

  const totalRentalFeeNum = parseRaw(undefined, data.total_rental_fee);
  const totalFinesNum = parseRaw(undefined, data.total_fines);

  const totalIncomeFormatted =
    data.total_income_formatted ||
    (data.total_income != null ? formatPrice(parseRaw(undefined, data.total_income)) : 'Rs. 0.00');
  const totalRefundsFormatted =
    data.total_refunds_formatted ||
    (data.total_refunds != null ? formatPrice(parseRaw(undefined, data.total_refunds)) : 'Rs. 0.00');

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Closed Bills Count */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Closed Bills
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#1a1a2e]">
            {totalCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Bills closed in range
          </p>
        </div>

        {/* 2. Closed Bill Profit (Rental Fee + Fines) */}
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-slate-700 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#f5a623] uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-[#f5a623]" /> Closed Bill Profit
            </span>
            <span className="text-[9px] bg-[#f5a623]/20 text-[#f5a623] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              Fee + Fines
            </span>
          </div>
          <div className="text-xl font-black text-white">
            {totalClosedProfitFormatted}
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Profit from closed bills + fines
          </p>
        </div>

        {/* 3. Total Rental Fee */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Rental Fees
            </span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {formatPrice(totalRentalFeeNum > 0 ? totalRentalFeeNum : filteredTotals.fee)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Base rental charges realized
          </p>
        </div>

        {/* 4. Total Fines */}
        <div className="bg-white rounded-xl p-4 border border-purple-200 shadow-sm bg-gradient-to-br from-white to-purple-50/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
              Total Fines
            </span>
            <AlertCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-purple-800">
            {formatPrice(totalFinesNum > 0 ? totalFinesNum : filteredTotals.fines)}
          </div>
          <p className="text-[11px] text-purple-600/80 mt-0.5">
            Damage fines collected on closure
          </p>
        </div>

        {/* 5. Total Income / Deposits */}
        <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Deposits (Income)
            </span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700">
            {totalIncomeFormatted}
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">
            Deposits taken for these bills
          </p>
        </div>

        {/* 6. Total Refunds */}
        <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Refunds Given
            </span>
            <RotateCcw className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700">
            {totalRefundsFormatted}
          </div>
          <p className="text-[11px] text-amber-600/80 mt-0.5">
            Security deposits refunded
          </p>
        </div>
      </div>

      {/* Action / Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 no-print">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by bill #, customer, mobile, NIC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            {expandedIds.size === filteredBills.length ? 'Collapse All' : 'Expand All Items'}
          </button>
        </div>
      </div>

      {/* Bill Count Banner */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>
          Showing <span className="font-bold text-slate-800">{filteredBills.length}</span> of{' '}
          <span className="font-bold text-slate-800">{bills.length}</span> closed bills
        </span>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-[#f5a623] hover:underline font-semibold"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Main Closed Bills Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3">Bill Number</th>
              <th className="py-3 px-3">Customer Details</th>
              <th className="py-3 px-3">Created</th>
              <th className="py-3 px-3">Closed At</th>
              <th className="py-3 px-3 text-center">Items</th>
              <th className="py-3 px-3 text-right">Rental Fee</th>
              <th className="py-3 px-3 text-right">Fines</th>
              <th className="py-3 px-3 text-right">Deposit</th>
              <th className="py-3 px-3 text-right">Refund</th>
              <th className="py-3 px-3 text-right">Closed Bill Profit</th>
              <th className="py-3 px-3 w-10 text-center no-print"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredBills.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-gray-400">
                  <PackageCheck className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  No closed bills match your search criteria.
                </td>
              </tr>
            ) : (
              filteredBills.map((b, idx) => {
                const isExpanded = expandedIds.has(b.id);
                return (
                  <BillRowItem
                    key={b.id || idx}
                    index={idx + 1}
                    bill={b}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpand(b.id)}
                  />
                );
              })
            )}
          </tbody>

          {/* Table Summary Footer */}
          {filteredBills.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-gray-200 text-xs">
                <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider text-slate-600">
                  Totals ({filteredBills.length} Bills):
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-slate-800">
                  {formatPrice(filteredTotals.fee)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-amber-700">
                  {formatPrice(filteredTotals.fines)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-emerald-700">
                  {formatPrice(filteredTotals.income)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-amber-700">
                  {formatPrice(filteredTotals.refunds)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-blue-900 font-black">
                  {formatPrice(filteredTotals.closedProfit)}
                </td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function BillRowItem({
  index,
  bill,
  isExpanded,
  onToggle
}: {
  index: number;
  bill: ClosedBill;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const items = Array.isArray(bill.items) ? bill.items : [];
  const fineAmt = parseRaw(bill.fines_raw, bill.fines);
  const closedProfit = parseRaw(
    bill.closed_bill_profit_raw ?? bill.profit_raw,
    bill.closed_bill_profit ?? bill.profit
  );

  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer transition-colors ${
          isExpanded ? 'bg-orange-50/60' : index % 2 === 1 ? 'bg-gray-50/30' : 'bg-white'
        } hover:bg-orange-50/40`}
      >
        <td className="py-3 px-3 text-center text-xs text-gray-400 font-mono">
          {index}
        </td>

        <td className="py-3 px-3 whitespace-nowrap">
          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200">
            {bill.bill_number}
          </span>
        </td>

        <td className="py-3 px-3">
          <div className="font-bold text-slate-900 leading-tight">
            {bill.customer}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
            {bill.customer_mobile && <span>📞 {bill.customer_mobile}</span>}
            {bill.customer_nic && <span>🆔 {bill.customer_nic}</span>}
          </div>
        </td>

        <td className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap">
          {bill.created_at || '-'}
        </td>

        <td className="py-3 px-3 text-xs font-semibold text-slate-800 whitespace-nowrap">
          {bill.closed_at || '-'}
        </td>

        <td className="py-3 px-3 text-center whitespace-nowrap">
          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
            {items.length || bill.items_count || 0}
          </span>
        </td>

        <td className="py-3 px-3 text-right font-medium text-slate-700 whitespace-nowrap tabular-nums">
          {bill.rental_fee}
        </td>

        <td
          className={`py-3 px-3 text-right whitespace-nowrap tabular-nums font-medium ${
            fineAmt > 0 ? 'text-amber-700 font-bold' : 'text-gray-400'
          }`}
        >
          {bill.fines}
        </td>

        <td className="py-3 px-3 text-right font-medium text-emerald-700 whitespace-nowrap tabular-nums">
          {bill.income}
        </td>

        <td className="py-3 px-3 text-right font-medium text-amber-700 whitespace-nowrap tabular-nums">
          {bill.refunds}
        </td>

        <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap tabular-nums">
          {formatPrice(closedProfit)}
        </td>

        <td className="py-3 px-3 text-center no-print">
          <button
            type="button"
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#f5a623]" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </td>
      </tr>

      {/* Expanded Line Items Detail Drawer */}
      {isExpanded && (
        <tr className="bg-orange-50/20 border-b border-orange-100">
          <td colSpan={12} className="p-0">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50/30 to-amber-50/10 border-l-4 border-[#f5a623]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-[#f5a623]" />
                  Rented Tools & Line Items ({items.length})
                </h4>
                {bill.discount > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                    Discount Applied: {bill.discount}%
                  </span>
                )}
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">No item lines available.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-orange-200/60 bg-white">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-orange-50/50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-orange-200/50">
                        <th className="py-2 px-3 text-left">Product / Tool</th>
                        <th className="py-2 px-3 text-left">Tool Serial #</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-center">Rental Days</th>
                        <th className="py-2 px-3 text-left">Returned Date</th>
                        <th className="py-2 px-3 text-right">Rental Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, itemIdx) => (
                        <tr key={itemIdx} className="hover:bg-orange-50/20">
                          <td className="py-2 px-3 font-bold text-slate-800">
                            {item.product_name}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {item.item_number}
                          </td>
                          <td className="py-2 px-3 text-center tabular-nums">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-3 text-center tabular-nums font-semibold">
                            {item.rental_days} day{item.rental_days !== 1 ? 's' : ''}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {item.returned_date || '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800 tabular-nums">
                            {formatPrice(item.rental_fee)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
