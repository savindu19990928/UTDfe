import { useState, useMemo } from 'react';
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  Calculator,
  Users,
  Landmark,
  Search,
  Hash,
  Calendar,
  Clock
} from 'lucide-react';
import {
  ExpensesReportData,
  ExpenseReportItem,
  ExpensesByUserItem,
  ExpensesByRegisterItem
} from '../../../types/reports';
import { formatPrice } from '../../../utils/format';

interface ExpensesReportViewProps {
  data: ExpensesReportData;
  startDate?: string;
  endDate?: string;
}

function parseAmount(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val == null || val === '') return 0;
  return parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
}

export function ExpensesReportView({
  data,
  startDate,
  endDate
}: ExpensesReportViewProps) {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedRegister, setSelectedRegister] = useState<string>('all');

  const expenses: ExpenseReportItem[] = useMemo(() => {
    return Array.isArray(data?.expenses)
      ? data.expenses
      : Array.isArray(data?.detailed_expenses)
      ? data.detailed_expenses
      : [];
  }, [data]);

  const expensesByUser: ExpensesByUserItem[] = useMemo(() => {
    return Array.isArray(data?.expenses_by_user) ? data.expenses_by_user : [];
  }, [data]);

  const expensesByRegister: ExpensesByRegisterItem[] = useMemo(() => {
    return Array.isArray(data?.expenses_by_register)
      ? data.expenses_by_register
      : [];
  }, [data]);

  const totalExpensesNum = useMemo(() => {
    if (
      data?.total_expenses != null ||
      data?.total_expense != null ||
      data?.expenses_total != null
    ) {
      return parseAmount(
        data.total_expenses ?? data.total_expense ?? data.expenses_total
      );
    }
    return expenses.reduce(
      (sum, e) => sum + parseAmount(e.amount_raw ?? e.amount),
      0
    );
  }, [data, expenses]);

  const expensesCount = data?.expenses_count ?? expenses.length;

  const averageExpenseNum = useMemo(() => {
    if (data?.average_expense_raw != null || data?.average_expense != null) {
      return parseAmount(data.average_expense_raw ?? data.average_expense);
    }
    return expensesCount > 0 ? totalExpensesNum / expensesCount : 0;
  }, [data, expensesCount, totalExpensesNum]);

  const highestExpenseNum = useMemo(() => {
    if (data?.highest_expense_raw != null || data?.highest_expense != null) {
      return parseAmount(data.highest_expense_raw ?? data.highest_expense);
    }
    if (expenses.length === 0) return 0;
    return Math.max(
      ...expenses.map((e) => parseAmount(e.amount_raw ?? e.amount))
    );
  }, [data, expenses]);

  const lowestExpenseNum = useMemo(() => {
    if (data?.lowest_expense_raw != null || data?.lowest_expense != null) {
      return parseAmount(data.lowest_expense_raw ?? data.lowest_expense);
    }
    if (expenses.length === 0) return 0;
    return Math.min(
      ...expenses.map((e) => parseAmount(e.amount_raw ?? e.amount))
    );
  }, [data, expenses]);

  const userOptions = useMemo(() => {
    const set = new Set<string>();
    expensesByUser.forEach((u) => {
      if (u.created_by) set.add(u.created_by);
    });
    expenses.forEach((e) => {
      if (e.created_by) set.add(e.created_by);
    });
    return Array.from(set);
  }, [expensesByUser, expenses]);

  const registerOptions = useMemo(() => {
    const set = new Set<string>();
    expensesByRegister.forEach((r) => {
      if (r.cash_register_id != null) set.add(String(r.cash_register_id));
    });
    expenses.forEach((e) => {
      if (e.cash_register_id != null) set.add(String(e.cash_register_id));
    });
    return Array.from(set);
  }, [expensesByRegister, expenses]);

  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (selectedUser !== 'all') {
      list = list.filter((e) => e.created_by === selectedUser);
    }
    if (selectedRegister !== 'all') {
      list = list.filter(
        (e) => String(e.cash_register_id) === selectedRegister
      );
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((e) => {
      const desc = (e.description || '').toLowerCase();
      const ref = (e.reference || '').toLowerCase();
      const notes = (e.notes || '').toLowerCase();
      const by = (e.created_by || '').toLowerCase();
      const createdAt = (e.created_at || '').toLowerCase();
      const date = (e.date || '').toLowerCase();
      const idStr = String(e.id || '');
      const regStr =
        e.cash_register_id != null ? `#${e.cash_register_id}` : '';
      return (
        desc.includes(q) ||
        ref.includes(q) ||
        notes.includes(q) ||
        by.includes(q) ||
        createdAt.includes(q) ||
        date.includes(q) ||
        idStr.includes(q) ||
        regStr.includes(q)
      );
    });
  }, [expenses, selectedUser, selectedRegister, search]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce(
      (sum, e) => sum + parseAmount(e.amount_raw ?? e.amount),
      0
    );
  }, [filteredExpenses]);

  const dateRangeLabel =
    startDate || endDate || data?.start_date || data?.end_date
      ? `${startDate || data?.start_date || 'Start'} → ${endDate || data?.end_date || 'Today'}`
      : 'All Dates';

  return (
    <div className="space-y-6">
      {/* Row 1: Summary KPI Cards (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Expenses */}
        <div className="bg-[#1a1a2e] rounded-xl p-5 border border-slate-700 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#f5a623] uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="p-2 bg-[#f5a623]/20 text-[#f5a623] rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {formatPrice(totalExpensesNum)}
          </div>
          <p className="text-xs text-slate-300 mt-1 truncate">
            {dateRangeLabel}
          </p>
        </div>

        {/* 2. Expenses Count */}
        <div className="bg-white rounded-xl p-5 border border-orange-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-orange-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">
              Expense Entries
            </span>
            <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
              <Hash className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-orange-800">
            {expensesCount.toLocaleString()}
          </div>
          <p className="text-xs text-orange-600/80 mt-1">
            Non-cancelled records
          </p>
        </div>

        {/* 3. Average Expense */}
        <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Average Expense
            </span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-800">
            {formatPrice(averageExpenseNum)}
          </div>
          <p className="text-xs text-blue-600/80 mt-1">
            Mean cost per expense
          </p>
        </div>

        {/* 4. Highest Expense */}
        <div className="bg-white rounded-xl p-5 border border-rose-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Highest Expense
            </span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">
            {formatPrice(highestExpenseNum)}
          </div>
          <p className="text-xs text-rose-600/80 mt-1">
            Largest single expense
          </p>
        </div>

        {/* 5. Lowest Expense */}
        <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Lowest Expense
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatPrice(lowestExpenseNum)}
          </div>
          <p className="text-xs text-emerald-600/80 mt-1">
            Smallest single expense
          </p>
        </div>
      </div>

      {/* Row 2: Breakdowns by Staff User & Cash Register */}
      {(expensesByUser.length > 0 || expensesByRegister.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Breakdown by Staff User */}
          {expensesByUser.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#f5a623]" />
                  Expenses by Staff User
                </h3>
                <span className="text-xs text-gray-500 font-medium">
                  {expensesByUser.length} user{expensesByUser.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/60 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="py-2.5 px-4 w-10 text-center">#</th>
                      <th className="py-2.5 px-4">Staff User</th>
                      <th className="py-2.5 px-4 text-center">Count</th>
                      <th className="py-2.5 px-4 text-right">Total Amount</th>
                      <th className="py-2.5 px-4 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expensesByUser.map((u, idx) => {
                      const amt = parseAmount(
                        u.total_amount_raw ?? u.total_amount
                      );
                      const pct =
                        totalExpensesNum > 0
                          ? Math.round((amt / totalExpensesNum) * 100)
                          : 0;
                      return (
                        <tr
                          key={`${u.created_by}-${idx}`}
                          className={`${
                            idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                          } hover:bg-orange-50/30 transition-colors`}>
                          <td className="py-2.5 px-4 text-center text-xs text-gray-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">
                            {u.created_by || 'Unknown'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                              {u.count}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-rose-700 tabular-nums">
                            {formatPrice(amt)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-xs font-semibold text-gray-500 tabular-nums">
                            {pct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Breakdown by Cash Register */}
          {expensesByRegister.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#f5a623]" />
                  Expenses by Cash Register
                </h3>
                <span className="text-xs text-gray-500 font-medium">
                  {expensesByRegister.length} session
                  {expensesByRegister.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/60 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="py-2.5 px-4">Register</th>
                      <th className="py-2.5 px-4">Opened At</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-center">Count</th>
                      <th className="py-2.5 px-4 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expensesByRegister.map((r, idx) => {
                      const amt = parseAmount(
                        r.total_amount_raw ?? r.total_amount
                      );
                      const isOpen =
                        (r.status || '').toLowerCase() === 'open';
                      return (
                        <tr
                          key={`${r.cash_register_id}-${idx}`}
                          className={`${
                            idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                          } hover:bg-orange-50/30 transition-colors`}>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                            #{r.cash_register_id}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-gray-600">
                            {r.opened_at || '-'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isOpen
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                              {r.status || 'Unknown'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                              {r.count}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-rose-700 tabular-nums">
                            {formatPrice(amt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 3: Itemized Expenses Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#f5a623]" />
              Itemized Expenses ({filteredExpenses.length})
            </h3>
            <p className="text-xs text-gray-500">
              Complete list of non-cancelled expenses recorded in period
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 no-print">
            {userOptions.length > 1 && (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#f5a623] outline-none font-medium text-gray-700">
                <option value="all">All Staff Users</option>
                {userOptions.map((u) => (
                  <option key={u} value={u}>
                    Staff: {u}
                  </option>
                ))}
              </select>
            )}

            {registerOptions.length > 1 && (
              <select
                value={selectedRegister}
                onChange={(e) => setSelectedRegister(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#f5a623] outline-none font-medium text-gray-700">
                <option value="all">All Registers</option>
                {registerOptions.map((r) => (
                  <option key={r} value={r}>
                    Register #{r}
                  </option>
                ))}
              </select>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search description, user, date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none w-60"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4">Cash Register</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-xs text-gray-400">
                    No expense records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, idx) => {
                  const amt = parseAmount(exp.amount_raw ?? exp.amount);
                  const regStatus = (
                    exp.cash_register_status || ''
                  ).toLowerCase();
                  return (
                    <tr
                      key={exp.id || idx}
                      className={`${
                        idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                      } hover:bg-orange-50/30 transition-colors`}>
                      <td className="py-3 px-4 text-center text-xs text-gray-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-slate-600">
                        #{exp.id}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {exp.date ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {exp.date}
                            </span>
                            {exp.time && (
                              <span className="inline-flex items-center gap-1 text-gray-500">
                                <Clock className="w-3 h-3 text-gray-400" />
                                {exp.time}
                              </span>
                            )}
                          </div>
                        ) : (
                          exp.created_at || '-'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {exp.description}
                        </div>
                        {exp.notes && exp.notes !== exp.description && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {exp.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                          {exp.created_by || 'System'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {exp.cash_register_id != null ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-700">
                              #{exp.cash_register_id}
                            </span>
                            {exp.cash_register_status && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  regStatus === 'open'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                {exp.cash_register_status}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-700 tabular-nums whitespace-nowrap">
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
                    colSpan={6}
                    className="py-3 px-4 text-right uppercase tracking-wider text-slate-600">
                    Total ({filteredExpenses.length} expense
                    {filteredExpenses.length !== 1 ? 's' : ''}):
                  </td>
                  <td className="py-3 px-4 text-right font-black text-rose-700 tabular-nums text-sm">
                    {formatPrice(filteredTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
