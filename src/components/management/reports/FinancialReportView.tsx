import { useState, useMemo } from 'react';
import {
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  RotateCcw,
  Wallet,
  AlertCircle,
  Receipt,
  Search,
  FileSpreadsheet
} from 'lucide-react';
import {
  FinancialReportData,
  FinancialBreakdownItem,
  FinancialExpenseItem
} from '../../../types/reports';
import { formatPrice } from '../../../utils/format';
import { exportFinancialReportToExcel } from '../../../utils/excelExport';

interface FinancialReportViewProps {
  data: FinancialReportData;
  startDate?: string;
  endDate?: string;
}

function parseAmount(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val == null || val === '') return 0;
  return parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
}

export function FinancialReportView({
  data,
  startDate,
  endDate
}: FinancialReportViewProps) {
  const [expenseSearch, setExpenseSearch] = useState('');
  const [txnSearch, setTxnSearch] = useState('');

  // Core Financial Metrics within Date Range
  const totalInNum = parseAmount(data?.total_money_in ?? data?.total_in);
  const totalOutNum = parseAmount(data?.total_money_out ?? data?.total_out);
  const netCashFlowNum =
    data?.net_cash_flow != null
      ? parseAmount(data.net_cash_flow)
      : totalInNum - totalOutNum;

  const depositTakenNum = parseAmount(
    data?.total_deposit_taken ?? data?.deposit_taken ?? data?.total_deposit
  );
  const refundGivenNum = parseAmount(
    data?.total_refund_given ?? data?.refund_given ?? data?.total_refunds
  );
  const finesCollectedNum = parseAmount(
    data?.total_fines_collected ?? data?.fines_collected ?? data?.total_fines
  );

  // Itemized Expenses List
  const expenses: FinancialExpenseItem[] = useMemo(() => {
    return Array.isArray(data?.expenses)
      ? data.expenses
      : Array.isArray(data?.detailed_expenses)
        ? data.detailed_expenses
        : [];
  }, [data]);

  const totalExpensesNum =
    data?.total_expenses != null ||
      data?.total_expense != null ||
      data?.expenses_total != null
      ? parseAmount(
        data?.total_expenses ?? data?.total_expense ?? data?.expenses_total
      )
      : expenses.reduce(
        (sum, e) => sum + parseAmount(e.amount_raw ?? e.amount),
        0
      );

  const expensesCount = data?.expenses_count ?? expenses.length;

  const filteredExpenses = useMemo(() => {
    if (!expenseSearch.trim()) return expenses;
    const q = expenseSearch.toLowerCase().trim();
    return expenses.filter((e) => {
      const desc = (e.description || '').toLowerCase();
      const by = (e.created_by || '').toLowerCase();
      const date = (e.created_at || '').toLowerCase();
      return desc.includes(q) || by.includes(q) || date.includes(q);
    });
  }, [expenses, expenseSearch]);

  const filteredExpensesTotal = useMemo(() => {
    return filteredExpenses.reduce(
      (sum, e) => sum + parseAmount(e.amount_raw ?? e.amount),
      0
    );
  }, [filteredExpenses]);

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

  const dateRangeLabel =
    startDate || endDate || data?.start_date || data?.end_date
      ? `${startDate || data?.start_date || 'Start'} → ${endDate || data?.end_date || 'Today'}`
      : 'Selected date range';

  const handleExportExcel = () => {
    exportFinancialReportToExcel(data, startDate, endDate);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end no-print">
        <button
          type="button"
          onClick={handleExportExcel}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1a1a2e] bg-[#f5a623]/20 hover:bg-[#f5a623]/30 border border-[#f5a623]/40 rounded-lg transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#1a1a2e]" />
          Export Excel
        </button>
      </div>

      {/* Row 1: Primary Cash Flow Metrics (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Total Money Came In */}
        <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Total Money Came In
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatPrice(totalInNum)}
          </div>
          <p className="text-xs text-emerald-600/80 mt-1">
            Total cash inflows within date range ({dateRangeLabel})
          </p>
        </div>

        {/* 2. Total Money Gone Out */}
        <div className="bg-white rounded-xl p-5 border border-rose-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-rose-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Total Money Gone Out
            </span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">
            {formatPrice(totalOutNum)}
          </div>
          <p className="text-xs text-rose-600/80 mt-1">
            Total cash outflows (refunds & expenses) within date range
          </p>
        </div>

        {/* 3. Net Cash Flow */}
        <div className="bg-[#1a1a2e] rounded-xl p-5 border border-slate-700 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#f5a623] uppercase tracking-wider">
              Net Cash Flow (In − Out)
            </span>
            <div className="p-2 bg-[#f5a623]/20 text-[#f5a623] rounded-lg">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-black ${netCashFlowNum >= 0 ? 'text-white' : 'text-rose-400'
              }`}
          >
            {formatPrice(netCashFlowNum)}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Net money movement within the selected date range
          </p>
        </div>
      </div>

      {/* Row 2: Deposits, Refunds, Fines & Expenses (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 4. Deposit Taken */}
        <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Deposit Taken
            </span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-800">
            {formatPrice(depositTakenNum)}
          </div>
          <p className="text-xs text-blue-600/80 mt-1">
            Security deposits collected within date range
          </p>
        </div>

        {/* 5. Refund Given */}
        <div className="bg-white rounded-xl p-5 border border-amber-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Refund Given
            </span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            {formatPrice(refundGivenNum)}
          </div>
          <p className="text-xs text-amber-600/80 mt-1">
            Security deposit refunds issued within date range
          </p>
        </div>

        {/* 6. Fines Collected */}
        <div className="bg-white rounded-xl p-5 border border-purple-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-purple-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              Fines Collected
            </span>
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-800">
            {formatPrice(finesCollectedNum)}
          </div>
          <p className="text-xs text-purple-600/80 mt-1">
            Damage fines collected within date range
          </p>
        </div>

        {/* 7. Total Expenses */}
        <div className="bg-white rounded-xl p-5 border border-orange-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-orange-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-orange-800">
            {formatPrice(totalExpensesNum)}
          </div>
          <p className="text-xs text-orange-600/80 mt-1">
            {expensesCount} expense{expensesCount !== 1 ? 's' : ''} paid within date range
          </p>
        </div>
      </div>

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
                  const inAmt = parseAmount(item.in);
                  const outAmt = parseAmount(item.out);
                  const netAmt = parseAmount(item.net);

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
                  <td
                    colSpan={2}
                    className="py-3 px-4 text-right uppercase tracking-wider text-slate-600"
                  >
                    Grand Total:
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 tabular-nums">
                    {formatPrice(totalInNum)}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-700 tabular-nums">
                    {formatPrice(totalOutNum)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-black tabular-nums ${netCashFlowNum >= 0 ? 'text-slate-900' : 'text-rose-700'
                      }`}
                  >
                    {formatPrice(netCashFlowNum)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Itemized Expenses Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-600" />
              Itemized Expenses ({expenses.length})
            </h3>
            <p className="text-xs text-gray-400">
              All non-cancelled expenses paid from cash registers within the date range
            </p>
          </div>
          {expenses.length > 0 && (
            <div className="relative no-print">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-2.5 px-4 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Created At</th>
                <th className="py-2.5 px-4">Created By</th>
                <th className="py-2.5 px-4 text-center">Register ID</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-gray-400">
                    No expenses recorded for this date range.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, idx) => {
                  const amt = parseAmount(exp.amount_raw ?? exp.amount);
                  return (
                    <tr
                      key={exp.id || idx}
                      className={`${idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                        } hover:bg-orange-50/30 transition-colors`}
                    >
                      <td className="py-2.5 px-4 text-center text-xs text-gray-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {exp.description || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                        {exp.created_at || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-600">
                        {exp.created_by || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center text-xs font-mono text-gray-500">
                        {exp.cash_register_id != null ? `#${exp.cash_register_id}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-orange-800 tabular-nums whitespace-nowrap">
                        {formatPrice(amt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-gray-200 text-xs">
                  <td
                    colSpan={5}
                    className="py-3 px-4 text-right uppercase tracking-wider text-slate-600"
                  >
                    Total Expenses ({filteredExpenses.length}):
                  </td>
                  <td className="py-3 px-4 text-right font-black text-orange-800 tabular-nums">
                    {formatPrice(filteredExpensesTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

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
                        {col
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTxns.slice(0, 100).map((txn, idx) => {
                  const cols = Object.keys(txn).filter(
                    (k) => k !== 'transaction_type'
                  );
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
                        const isMoney =
                          !/times|count|qty|quantity|stock|days|hours|minutes|number|rate|percent|rented/i.test(
                            col
                          ) &&
                          /amount|total|price|deposit|income|refund/i.test(col);

                        return (
                          <td
                            key={col}
                            className={`py-2 px-3 ${isNumeric ? 'text-right tabular-nums' : 'text-left'
                              }`}
                          >
                            {isMoney && isNumeric
                              ? formatPrice(Number(val))
                              : /times|count|qty|quantity/i.test(col) &&
                                isNumeric
                                ? String(Number(val))
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
