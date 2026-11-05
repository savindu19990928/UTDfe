import { useState, useMemo } from 'react';
import {
  FolderOpen,
  TrendingUp,
  Wallet,
  Receipt,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  Package
} from 'lucide-react';
import { OpenedBillsReportData, OpenedBill } from '../../../types/reports';
import { formatPrice } from '../../../utils/format';

interface OpenedBillsReportViewProps {
  data: OpenedBillsReportData;
  endDate?: string;
}

function parseRaw(rawVal: number | undefined, formattedVal: string | number | undefined): number {
  if (typeof rawVal === 'number' && !isNaN(rawVal)) return rawVal;
  if (typeof formattedVal === 'number' && !isNaN(formattedVal)) return formattedVal;
  if (formattedVal == null || formattedVal === '') return 0;
  return parseFloat(String(formattedVal).replace(/[^0-9.-]/g, '')) || 0;
}

export function OpenedBillsReportView({
  data,
  endDate
}: OpenedBillsReportViewProps) {
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const bills: OpenedBill[] = useMemo(() => {
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
      const status = (b.status || '').toLowerCase();
      return (
        billNo.includes(q) ||
        customer.includes(q) ||
        nic.includes(q) ||
        mobile.includes(q) ||
        status.includes(q)
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
        const charged = parseRaw(
          b.charged_amount_raw ?? b.income_raw,
          b.charged_amount ?? b.income
        );
        const dep = parseRaw(
          b.deposit_taken_raw ?? b.deposit_raw,
          b.deposit_taken ?? b.deposit
        );
        return {
          fee: acc.fee + fee,
          fines: acc.fines + fines,
          charged: acc.charged + charged,
          deposit: acc.deposit + dep
        };
      },
      { fee: 0, fines: 0, charged: 0, deposit: 0 }
    );
  }, [filteredBills]);

  const totalCount = data?.opened_bills_count ?? data?.open_bills_count ?? bills.length;
  const totalChargedNum = parseRaw(
    undefined,
    data?.total_charged_amount ?? data?.total_income
  );
  const totalDepositNum = parseRaw(
    undefined,
    data?.total_deposit_taken ?? data?.total_deposit
  );
  const totalRentalFeeNum = parseRaw(undefined, data?.total_rental_fee);
  const totalFinesNum = parseRaw(undefined, data?.total_fines);

  const effectiveEndDate = endDate || data?.end_date || 'Selected End Date';

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Opened Bills Count */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Opened Bills
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FolderOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1a1a2e]">
            {totalCount.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Up to {effectiveEndDate}
          </p>
        </div>

        {/* 2. Total Income from Opened Bills (Amount Customer Must Be Charged to End Date) */}
        <div className="bg-[#1a1a2e] rounded-xl p-5 border border-slate-700 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#f5a623] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#f5a623]" /> Total Income (Charged)
            </span>
            <span className="text-[10px] bg-[#f5a623]/20 text-[#f5a623] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Excludes Deposit
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            {formatPrice(totalChargedNum)}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Amount customer must be charged up to {effectiveEndDate}
          </p>
        </div>

        {/* 3. Total Deposit Taken from Open Bills to Selected End Date */}
        <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Deposit Taken (Open Bills)
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatPrice(totalDepositNum)}
          </div>
          <p className="text-xs text-emerald-600/80 mt-1">
            Deposits collected on open bills up to {effectiveEndDate}
          </p>
        </div>

        {/* 4. Accrued Rental Fee & Fines Breakdown */}
        <div className="bg-white rounded-xl p-5 border border-amber-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Accrued Fee + Fines
            </span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-800">
            Fee: {formatPrice(totalRentalFeeNum)}
          </div>
          <p className="text-xs font-semibold text-amber-700 mt-1">
            Fines: {formatPrice(totalFinesNum)}
          </p>
        </div>
      </div>

      {/* Action / Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 no-print">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by bill #, customer, mobile, NIC, status..."
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
          <span className="font-bold text-slate-800">{bills.length}</span> opened bills
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

      {/* Main Opened Bills Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3">Bill Number</th>
              <th className="py-3 px-3">Customer Details</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Created</th>
              <th className="py-3 px-3 text-center">Items</th>
              <th className="py-3 px-3 text-right">Rental Fee</th>
              <th className="py-3 px-3 text-right">Fines</th>
              <th className="py-3 px-3 text-right">Charged Amount (Income)</th>
              <th className="py-3 px-3 text-right">Deposit Taken</th>
              <th className="py-3 px-3 w-10 text-center no-print"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredBills.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-gray-400">
                  <FolderOpen className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  No opened bills match your search criteria.
                </td>
              </tr>
            ) : (
              filteredBills.map((b, idx) => {
                const isExpanded = expandedIds.has(b.id);
                return (
                  <OpenedBillRowItem
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
                  Totals ({filteredBills.length} Open Bills):
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-slate-800">
                  {formatPrice(filteredTotals.fee)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-amber-700">
                  {formatPrice(filteredTotals.fines)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-blue-900 font-black">
                  {formatPrice(filteredTotals.charged)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-emerald-700">
                  {formatPrice(filteredTotals.deposit)}
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

function OpenedBillRowItem({
  index,
  bill,
  isExpanded,
  onToggle
}: {
  index: number;
  bill: OpenedBill;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const items = Array.isArray(bill.items) ? bill.items : [];
  const feeAmt = parseRaw(bill.rental_fee_raw, bill.rental_fee);
  const fineAmt = parseRaw(bill.fines_raw, bill.fines);
  const chargedAmt = parseRaw(
    bill.charged_amount_raw ?? bill.income_raw,
    bill.charged_amount ?? bill.income
  );
  const depositAmt = parseRaw(
    bill.deposit_taken_raw ?? bill.deposit_raw,
    bill.deposit_taken ?? bill.deposit
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

        <td className="py-3 px-3 whitespace-nowrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
            {bill.status || 'active'}
          </span>
        </td>

        <td className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap">
          {bill.created_at || '-'}
        </td>

        <td className="py-3 px-3 text-center whitespace-nowrap">
          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
            {items.length || bill.items_count || 0}
          </span>
        </td>

        <td className="py-3 px-3 text-right font-medium text-slate-700 whitespace-nowrap tabular-nums">
          {formatPrice(feeAmt)}
        </td>

        <td
          className={`py-3 px-3 text-right whitespace-nowrap tabular-nums font-medium ${
            fineAmt > 0 ? 'text-amber-700 font-bold' : 'text-gray-400'
          }`}
        >
          {formatPrice(fineAmt)}
        </td>

        <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap tabular-nums">
          {formatPrice(chargedAmt)}
        </td>

        <td className="py-3 px-3 text-right font-medium text-emerald-700 whitespace-nowrap tabular-nums">
          {formatPrice(depositAmt)}
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
          <td colSpan={11} className="p-0">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50/30 to-amber-50/10 border-l-4 border-[#f5a623]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#f5a623]" />
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
                        <th className="py-2 px-3 text-left">Start Date</th>
                        <th className="py-2 px-3 text-left">Expected End</th>
                        <th className="py-2 px-3 text-left">Returned Status</th>
                        <th className="py-2 px-3 text-center">Accrued Days</th>
                        <th className="py-2 px-3 text-right">Accrued Fee</th>
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
                          <td className="py-2 px-3 text-slate-600">
                            {item.rental_start_date || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {item.rental_end_date || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {item.is_returned
                              ? `Returned (${item.returned_date || 'Yes'})`
                              : 'Still Rented'}
                          </td>
                          <td className="py-2 px-3 text-center tabular-nums font-semibold">
                            {item.rental_days} day{item.rental_days !== 1 ? 's' : ''}
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

