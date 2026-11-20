import { useState, useMemo } from 'react';
import {
  Wrench,
  Gauge,
  RotateCcw,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  User,
  Phone,
  Calendar,
  Hash,
  DollarSign,
  ShieldAlert
} from 'lucide-react';
import {
  SingleMachineHistoryReportData,
  MachineHistoryRentalBill,
  MachineResetHistoryItem
} from '../../../types/reports';
import { formatPrice } from '../../../utils/format';

interface SingleMachineHistoryReportViewProps {
  data: SingleMachineHistoryReportData;
  startDate?: string;
  endDate?: string;
}

function parseAmount(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val == null || val === '') return 0;
  return parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
}

export function SingleMachineHistoryReportView({
  data,
  startDate,
  endDate
}: SingleMachineHistoryReportViewProps) {
  const [billSearch, setBillSearch] = useState('');
  const [billStatusFilter, setBillStatusFilter] = useState<
    'all' | 'active' | 'returned' | 'closed'
  >('all');
  const [resetSearch, setResetSearch] = useState('');

  const machine = data?.machine;
  const machineNumber =
    machine?.machine_number || data?.machine_number || 'N/A';
  const machineId = machine?.machine_id ?? data?.machine_id;
  const productName =
    machine?.product_name || data?.product_name || 'Unknown Product';
  const itemNumber = machine?.item_number;
  const categoryName = machine?.category_name;
  const pricePerDay = parseAmount(machine?.price_per_day);
  const usedCount = machine?.used_count ?? 0;
  const maxUseCount = machine?.max_use_count ?? 0;
  const totalUsedCount = machine?.total_used_count ?? 0;
  const needsReset =
    machine?.needs_reset ?? (maxUseCount > 0 && usedCount >= maxUseCount);
  const isActive = machine?.is_active ?? true;
  const isDamaged = machine?.is_damaged ?? false;
  const isCurrentlyRented =
    data?.is_currently_rented ?? machine?.is_currently_rented ?? false;
  const currentRental = data?.current_rental;

  const rentalBills: MachineHistoryRentalBill[] = useMemo(() => {
    return Array.isArray(data?.rental_bills)
      ? data.rental_bills
      : Array.isArray(data?.bills)
      ? data.bills
      : [];
  }, [data]);

  const resetHistory: MachineResetHistoryItem[] = useMemo(() => {
    return Array.isArray(data?.reset_history)
      ? data.reset_history
      : Array.isArray(data?.resets)
      ? data.resets
      : [];
  }, [data]);

  const totalPeriodRevenue = useMemo(() => {
    return rentalBills.reduce(
      (sum, b) => sum + parseAmount(b.rental_fee_raw ?? b.rental_fee),
      0
    );
  }, [rentalBills]);

  const totalPeriodDays = useMemo(() => {
    return rentalBills.reduce((sum, b) => sum + (Number(b.rental_days) || 0), 0);
  }, [rentalBills]);

  const filteredBills = useMemo(() => {
    let list = rentalBills;
    if (billStatusFilter === 'active') {
      list = list.filter(
        (b) => !b.is_returned && (b.bill_status || b.status) !== 'closed'
      );
    } else if (billStatusFilter === 'returned') {
      list = list.filter(
        (b) => b.is_returned && (b.bill_status || b.status) !== 'closed'
      );
    } else if (billStatusFilter === 'closed') {
      list = list.filter(
        (b) => (b.bill_status || b.status || '').toLowerCase() === 'closed'
      );
    }

    if (!billSearch.trim()) return list;
    const q = billSearch.toLowerCase().trim();
    return list.filter((b) => {
      const billNo = (b.bill_number || '').toLowerCase();
      const cust = (b.customer_name || b.customer || '').toLowerCase();
      const mob = (b.customer_mobile || '').toLowerCase();
      const nic = (b.customer_nic || '').toLowerCase();
      const start = (b.rental_start_date || '').toLowerCase();
      const end = (b.rental_end_date || '').toLowerCase();
      return (
        billNo.includes(q) ||
        cust.includes(q) ||
        mob.includes(q) ||
        nic.includes(q) ||
        start.includes(q) ||
        end.includes(q)
      );
    });
  }, [rentalBills, billStatusFilter, billSearch]);

  const filteredBillsRevenue = useMemo(() => {
    return filteredBills.reduce(
      (sum, b) => sum + parseAmount(b.rental_fee_raw ?? b.rental_fee),
      0
    );
  }, [filteredBills]);

  const filteredBillsDays = useMemo(() => {
    return filteredBills.reduce(
      (sum, b) => sum + (Number(b.rental_days) || 0),
      0
    );
  }, [filteredBills]);

  const filteredResets = useMemo(() => {
    if (!resetSearch.trim()) return resetHistory;
    const q = resetSearch.toLowerCase().trim();
    return resetHistory.filter((r) => {
      const by = (r.reset_by || '').toLowerCase();
      const at = (r.reset_at || r.reset_date || '').toLowerCase();
      const notes = (r.notes || '').toLowerCase();
      return by.includes(q) || at.includes(q) || notes.includes(q);
    });
  }, [resetHistory, resetSearch]);

  const usageRatio =
    maxUseCount > 0 ? Math.min(100, Math.round((usedCount / maxUseCount) * 100)) : 0;

  const dateRangeLabel =
    startDate || endDate || data?.start_date || data?.end_date
      ? `${startDate || data?.start_date || 'Start'} → ${endDate || data?.end_date || 'Today'}`
      : 'All Time';

  return (
    <div className="space-y-6">
      {/* 1. Machine Profile & Status Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-[#1a1a2e] text-[#f5a623] rounded-xl flex-shrink-0">
              <Wrench className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-black px-3 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {machineNumber}
                </span>
                {machineId != null && (
                  <span className="text-xs font-mono text-gray-400">
                    ID #{machineId}
                  </span>
                )}
                {isActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
                    Inactive
                  </span>
                )}
                {isDamaged && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                    <ShieldAlert className="w-3.5 h-3.5" /> Damaged
                  </span>
                )}
                {isCurrentlyRented ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    <Clock className="w-3.5 h-3.5" /> Currently Rented
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    Available in Store
                  </span>
                )}
                {needsReset && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" /> Needs Maintenance Reset
                  </span>
                )}
              </div>

              <h3 className="text-xl font-black text-[#1a1a2e] mt-1.5">
                {productName}
              </h3>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                {itemNumber && (
                  <span>
                    Item Code:{' '}
                    <strong className="font-mono text-gray-700">
                      {itemNumber}
                    </strong>
                  </span>
                )}
                {categoryName && (
                  <span>
                    Category:{' '}
                    <strong className="text-gray-700">{categoryName}</strong>
                  </span>
                )}
                {pricePerDay > 0 && (
                  <span>
                    Daily Rate:{' '}
                    <strong className="text-emerald-700">
                      {formatPrice(pricePerDay)} / day
                    </strong>
                  </span>
                )}
                {machine?.last_reset_date && (
                  <span>
                    Last Reset:{' '}
                    <strong className="text-gray-700">
                      {machine.last_reset_date}
                    </strong>
                  </span>
                )}
                {machine?.created_at && (
                  <span>
                    Added:{' '}
                    <strong className="text-gray-700">
                      {machine.created_at}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-left lg:text-right border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
              Report Period
            </span>
            <span className="text-sm font-bold text-slate-700">
              {dateRangeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 2. KPI Cards (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Cycle Usage */}
        <div
          className={`bg-white rounded-xl p-5 border shadow-sm relative overflow-hidden ${
            needsReset
              ? 'border-rose-300 bg-gradient-to-br from-white to-rose-50/40'
              : 'border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                needsReset ? 'text-rose-700' : 'text-indigo-700'
              }`}>
              Cycle Usage
            </span>
            <div
              className={`p-2 rounded-lg ${
                needsReset
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-indigo-100 text-indigo-700'
              }`}>
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {usedCount}{' '}
            <span className="text-base font-bold text-gray-400">
              / {maxUseCount}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full ${
                needsReset ? 'bg-rose-600' : 'bg-indigo-600'
              }`}
              style={{ width: `${usageRatio}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {needsReset
              ? 'Max usage reached — reset required'
              : 'Uses since last maintenance reset'}
          </p>
        </div>

        {/* Lifetime Uses */}
        <div className="bg-white rounded-xl p-5 border border-purple-200 shadow-sm bg-gradient-to-br from-white to-purple-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              Lifetime Uses
            </span>
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <Hash className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-900">
            {totalUsedCount.toLocaleString()}
          </div>
          <p className="text-xs text-purple-600/80 mt-1">
            Total cumulative rentals
          </p>
        </div>

        {/* Rental Bills in Period */}
        <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Rentals in Period
            </span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-900">
            {(data?.rental_bills_count ?? rentalBills.length).toLocaleString()}
          </div>
          <p className="text-xs text-blue-600/80 mt-1">
            {data?.distinct_bills_count ?? rentalBills.length} distinct bill
            {(data?.distinct_bills_count ?? rentalBills.length) !== 1 ? 's' : ''} ·{' '}
            {totalPeriodDays} rental days
          </p>
        </div>

        {/* Period Rental Revenue */}
        <div className="bg-[#1a1a2e] rounded-xl p-5 border border-slate-700 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#f5a623] uppercase tracking-wider">
              Period Rental Fee
            </span>
            <div className="p-2 bg-[#f5a623]/20 text-[#f5a623] rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {formatPrice(totalPeriodRevenue)}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Total rental fee from {rentalBills.length} bill
            {rentalBills.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Usage Resets */}
        <div className="bg-white rounded-xl p-5 border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Usage Resets
            </span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-800">
            {(data?.reset_count ?? resetHistory.length).toLocaleString()}
          </div>
          <p className="text-xs text-amber-600/80 mt-1">
            In period (Lifetime resets:{' '}
            {data?.total_reset_count ?? resetHistory.length})
          </p>
        </div>
      </div>

      {/* 3. Current Rental Status Banner */}
      {isCurrentlyRented && currentRental ? (
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                  <Clock className="w-3.5 h-3.5" /> Currently Rented Out
                </span>
                <span className="font-mono font-bold text-sm text-blue-900 bg-white px-2.5 py-0.5 rounded border border-blue-200">
                  {currentRental.bill_number}
                </span>
                {currentRental.is_overdue && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                    <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-800 mt-2">
                <span className="font-bold flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  {currentRental.customer_name}
                </span>
                {currentRental.customer_mobile && (
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {currentRental.customer_mobile}
                  </span>
                )}
                {currentRental.customer_nic && (
                  <span className="text-xs text-slate-600">
                    NIC: <strong>{currentRental.customer_nic}</strong>
                  </span>
                )}
                {currentRental.customer_address && (
                  <span className="text-xs text-slate-600">
                    Address: <strong>{currentRental.customer_address}</strong>
                  </span>
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg px-4 py-2.5 border border-blue-100 text-xs space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Rental Period:</span>
                <span className="font-bold text-slate-800">
                  {currentRental.rental_start_date || '-'} →{' '}
                  {currentRental.rental_end_date || '-'}
                </span>
              </div>
              {currentRental.bill_created_at && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">Bill Created:</span>
                  <span className="font-medium text-slate-700">
                    {currentRental.bill_created_at}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* 4. Rental Bills History Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#f5a623]" />
              Rental Bills History ({filteredBills.length})
            </h3>
            <p className="text-xs text-gray-500">
              All rental bills where machine {machineNumber} was rented during the
              selected period
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 no-print">
            <div className="flex items-center bg-gray-200/70 p-0.5 rounded-lg text-xs font-semibold">
              {(
                [
                  ['all', 'All'],
                  ['active', 'Active'],
                  ['returned', 'Returned'],
                  ['closed', 'Closed']
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBillStatusFilter(key)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    billStatusFilter === key
                      ? 'bg-white text-gray-900 shadow-sm font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search bill #, customer, phone..."
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none w-56"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4">Bill Number</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Rental Period</th>
                <th className="py-3 px-4">Return Info</th>
                <th className="py-3 px-4 text-center">Bill Status</th>
                <th className="py-3 px-4 text-center">Days</th>
                <th className="py-3 px-4 text-right">Rental Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBills.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-xs text-gray-400">
                    No rental bills found for this machine in the selected period.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b, idx) => {
                  const fee = parseAmount(b.rental_fee_raw ?? b.rental_fee);
                  const statusStr = (
                    b.bill_status ||
                    b.status ||
                    'open'
                  ).toLowerCase();
                  return (
                    <tr
                      key={`${b.bill_id}-${b.item_id || idx}`}
                      className={`${
                        idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                      } hover:bg-orange-50/30 transition-colors`}>
                      <td className="py-3 px-4 text-center text-xs text-gray-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200">
                          {b.bill_number}
                        </span>
                        {b.created_at && (
                          <div className="text-[11px] text-gray-400 mt-1">
                            Created: {b.created_at}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {b.customer_name || b.customer || 'Customer'}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 mt-0.5">
                          {b.customer_mobile && (
                            <span>📞 {b.customer_mobile}</span>
                          )}
                          {b.customer_nic && <span>· NIC: {b.customer_nic}</span>}
                          {b.customer_address && (
                            <span>· {b.customer_address}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1 font-medium text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{b.rental_start_date || '-'}</span>
                          <span className="text-gray-400">→</span>
                          <span>{b.rental_end_date || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {b.is_returned ? (
                          <div>
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Returned
                            </span>
                            {(b.returned_date || b.returned_time) && (
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                {b.returned_date}{' '}
                                {b.returned_time ? `at ${b.returned_time}` : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-600">
                            <Clock className="w-3.5 h-3.5" /> Out on Rent
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            statusStr === 'closed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : statusStr === 'overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                          {b.bill_status || b.status || 'Open'}
                        </span>
                        {b.closed_at && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {b.closed_at}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800 tabular-nums">
                        {b.rental_days ?? '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">
                        {formatPrice(fee)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredBills.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-gray-200 text-xs">
                  <td
                    colSpan={6}
                    className="py-3 px-4 text-right uppercase tracking-wider text-slate-600">
                    Total ({filteredBills.length} bill
                    {filteredBills.length !== 1 ? 's' : ''}):
                  </td>
                  <td className="py-3 px-4 text-center font-black text-slate-900 tabular-nums">
                    {filteredBillsDays} days
                  </td>
                  <td className="py-3 px-4 text-right font-black text-emerald-700 tabular-nums text-sm">
                    {formatPrice(filteredBillsRevenue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 5. Usage Count Reset History Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#f5a623]" />
              Usage Count Reset History ({filteredResets.length})
            </h3>
            <p className="text-xs text-gray-500">
              Every time this machine&apos;s usage count was reset during the period
            </p>
          </div>

          {resetHistory.length > 0 && (
            <div className="relative no-print">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search reset by, date, notes..."
                value={resetSearch}
                onChange={(e) => setResetSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none w-56"
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4">Reset ID</th>
                <th className="py-3 px-4">Reset Date & Time</th>
                <th className="py-3 px-4 text-center">Previous Used Count</th>
                <th className="py-3 px-4 text-center">
                  Lifetime Uses at Reset
                </th>
                <th className="py-3 px-4">Reset By</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredResets.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-xs text-gray-400">
                    No usage count resets recorded in this period.
                  </td>
                </tr>
              ) : (
                filteredResets.map((r, idx) => (
                  <tr
                    key={r.id || idx}
                    className={`${
                      idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                    } hover:bg-orange-50/30 transition-colors`}>
                    <td className="py-3 px-4 text-center text-xs text-gray-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-600">
                      #{r.id}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-800 whitespace-nowrap">
                      {r.reset_date
                        ? `${r.reset_date}${r.reset_time ? ` ${r.reset_time}` : ''}`
                        : r.reset_at || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 tabular-nums">
                        {r.previous_used_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700 tabular-nums">
                      {r.total_used_count_at_reset ?? '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                        {r.reset_by || 'Admin'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600">
                      {r.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
