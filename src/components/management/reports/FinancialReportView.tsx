import { useState, useMemo } from 'react';
import {
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Info,
  DollarSign,
  Receipt,
  Search,
  Layers
} from 'lucide-react';
import { FinancialReportData, FinancialBreakdownItem } from '../../../types/reports';
import { formatPrice } from '../../../utils/format';

interface FinancialReportViewProps {
  data: FinancialReportData;
  startDate?: string;
  endDate?: string;
}

export function FinancialReportView({
  data,
  startDate,
  endDate
}: FinancialReportViewProps) {
  const [txnSearch, setTxnSearch] = useState('');

  // Primary Metrics
  const totalMoneyNum = parseFloat(String(data?.total_money || '0').replace(/[^0-9.-]/g, '')) || 0;
  const totalInNum = parseFloat(String(data?.total_in || '0').replace(/[^0-9.-]/g, '')) || 0;
  const totalOutNum = parseFloat(String(data?.total_out || '0').replace(/[^0-9.-]/g, '')) || 0;

  // New Field: total_closed_bill_profit
  const closedBillProfitRaw =
    data?.total_closed_bill_profit ?? (data?.['total closed bill profit'] ?? 0);
  const totalClosedBillProfitNum =
    parseFloat(String(closedBillProfitRaw).replace(/[^0-9.-]/g, '')) || 0;

  // Secondary metrics
  const saleIncomeNum =
    parseFloat(String(data?.sale_income || '0').replace(/[^0-9.-]/g, '')) || 0;
  const rentalIncomeNum =
    parseFloat(String(data?.rental_income || '0').replace(/[^0-9.-]/g, '')) || 0;
  const depositNonClosedNum =
    parseFloat(String(data?.rental_deposit_non_closed || '0').replace(/[^0-9.-]/g, '')) || 0;

  // Breakdown List
  const breakdown: FinancialBreakdownItem[] = useMemo(() => {
    return Array.isArray(data?.breakdown) ? data.breakdown : [];
  }, [data]);

  // Transactions list (if present)
  const transactions: Record<string, any>[] = useMemo(() => {
    return Array.isArray(data?.transactions) ? data.transactions : [];
  }, [data]);

  const filteredTxns = useMemo(() => {
    if (!txnSearch.trim()) return transactions;
    const q = txnSearch.toLowerCase().trim();
    return transactions.filter((t) => {
      return Object.values(t).some((val) =>
        String(val ?? '').toLowerCase().includes(q)
      );
    });
  }, [transactions, txnSearch]);

  return (
    <div className="space-y-6">
      {/* Primary Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Money (Net Balance) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Money (Net Cash)
            </span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-black ${totalMoneyNum >= 0 ? 'text-[#1a1a2e]' : 'text-rose-600'
              }`}
          >
            {formatPrice(totalMoneyNum)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total Inflow minus Total Outflow
          </p>
        </div>

        {/* Total Inflow */}
        <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Total Inflow (Cash In)
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatPrice(totalInNum)}
          </div>
          <p className="text-xs text-emerald-600/80 mt-1">
            All customer payments & deposits received
          </p>
        </div>

        {/* Total Outflow */}
        <div className="bg-white rounded-xl p-5 border border-rose-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Total Outflow (Cash Out)
            </span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">
            {formatPrice(totalOutNum)}
          </div>
          <p className="text-xs text-rose-600/80 mt-1">
            Customer refunds & shop cash expenses
          </p>
        </div>

        {/* NEW FIELD: Total Closed Bill Profit */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d4059] rounded-xl p-5 text-white shadow-md relative overflow-hidden border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#f5a623] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#f5a623]" /> Total Closed Bill Profit
            </span>
            {/* <span className="text-[10px] bg-[#f5a623] text-[#1a1a2e] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm">
              NEW
            </span> */}
          </div>
          <div className="text-2xl font-black text-[#f5a623]">
            {formatPrice(totalClosedBillProfitNum)}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Net profit (fees + fines) from all bills closed on or before {endDate || 'end date'}
          </p>
        </div>
      </div>

      {/* Secondary Operational Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Sale Income */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Sale Income
            </span>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {formatPrice(saleIncomeNum)}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Direct retail sales completed in window
          </p>
        </div>

        {/* Rental Income */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Rental Income (Created Period)
            </span>
            <Receipt className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {formatPrice(rentalIncomeNum)}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Rental fee charged on bills opened in date range
          </p>
        </div>

        {/* Unclosed Held Rental Deposits */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Unclosed Rental Deposits
            </span>
            <Layers className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-amber-700">
            {formatPrice(depositNonClosedNum)}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Security deposits currently held for ongoing active rentals
          </p>
        </div>
      </div>

      {/* Financial Metrics Clarification Banner */}
      {/* <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-700 no-print">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-blue-900 block mb-0.5">
            Understanding Financial Reporting Metrics:
          </span>
          <p className="text-slate-600 leading-relaxed">
            <strong>Total Closed Bill Profit ({formatPrice(totalClosedBillProfitNum)}):</strong> Tracks all rental bills based on their actual{' '}
            <span className="underline decoration-blue-400 font-semibold">closure date</span> (`closed_at &le; {endDate || 'selected end date'}`), summing rental fees and damage fines realized upon bill settlement.
            <br className="my-1" />
            <strong>Rental Income ({formatPrice(rentalIncomeNum)}):</strong> Aggregates rental charges based strictly on when bills were originally{' '}
            <span className="underline decoration-blue-400 font-semibold">created</span> within the reporting window.
          </p>
        </div>
      </div> */}

      {/* Cash Flow Breakdown Table */}
      {breakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#f5a623]" />
              Cash Flow Breakdown by Source
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              {breakdown.length} sources
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-2.5 px-4 w-10 text-center">#</th>
                  <th className="py-2.5 px-4">Source / Category</th>
                  <th className="py-2.5 px-4 text-right">Money In</th>
                  <th className="py-2.5 px-4 text-right">Money Out</th>
                  <th className="py-2.5 px-4 text-right">Net Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {breakdown.map((item, idx) => {
                  const inAmt = parseFloat(String(item.in || '0').replace(/[^0-9.-]/g, '')) || 0;
                  const outAmt = parseFloat(String(item.out || '0').replace(/[^0-9.-]/g, '')) || 0;
                  const netAmt = parseFloat(String(item.net || '0').replace(/[^0-9.-]/g, '')) || 0;

                  return (
                    <tr
                      key={idx}
                      className={`${idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                        } hover:bg-orange-50/30 transition-colors`}
                    >
                      <td className="py-2.5 px-4 text-center text-xs text-gray-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {item.source}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-emerald-700 tabular-nums">
                        {inAmt > 0 ? formatPrice(inAmt) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-rose-700 tabular-nums">
                        {outAmt > 0 ? formatPrice(outAmt) : '-'}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-bold tabular-nums ${netAmt >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                      >
                        {formatPrice(netAmt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-gray-200 text-xs">
                  <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider text-slate-600">
                    Grand Total:
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 tabular-nums">
                    {formatPrice(totalInNum)}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-700 tabular-nums">
                    {formatPrice(totalOutNum)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-black tabular-nums ${totalMoneyNum >= 0 ? 'text-slate-900' : 'text-rose-700'
                      }`}
                  >
                    {formatPrice(totalMoneyNum)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Ledger (if present) */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Itemized Transactions ({transactions.length})
              </h3>
              <p className="text-xs text-gray-400">
                All ledger events recorded in the selected date range
              </p>
            </div>
            <div className="relative no-print">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={txnSearch}
                onChange={(e) => setTxnSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  {Object.keys(transactions[0] || {})
                    .filter((k) => k !== 'transaction_type')
                    .map((col) => (
                      <th key={col} className="py-2.5 px-3">
                        {col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTxns.slice(0, 100).map((txn, idx) => {
                  const cols = Object.keys(txn).filter((k) => k !== 'transaction_type');
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-center text-gray-400 font-mono">
                        {idx + 1}
                      </td>
                      {cols.map((col) => {
                        const val = txn[col];
                        const isNumeric =
                          val != null &&
                          val !== '' &&
                          typeof val !== 'boolean' &&
                          !isNaN(Number(val));
                        const isMoney = /amount|total|price|deposit|income|refund/i.test(col);

                        return (
                          <td
                            key={col}
                            className={`py-2 px-3 ${isNumeric ? 'text-right tabular-nums' : 'text-left'
                              }`}
                          >
                            {isMoney && isNumeric
                              ? formatPrice(Number(val))
                              : String(val ?? '-')}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredTxns.length > 100 && (
            <div className="p-2 text-center text-xs text-gray-400 bg-gray-50 border-t border-gray-200">
              Showing first 100 of {filteredTxns.length} records.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
