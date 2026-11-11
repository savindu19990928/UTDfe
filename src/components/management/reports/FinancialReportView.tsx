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
  CreditCard,
  Landmark,
  CircleDollarSign
} from 'lucide-react';
import {
  FinancialReportData,
  FinancialBreakdownItem,
  FinancialExpenseItem,
  PaymentMethodBreakdownItem
} from '../../../types/reports';
import { formatPrice } from '../../../utils/format';

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

function getPaymentMethodIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('card')) {
    return <CreditCard className="w-4 h-4 text-blue-600" />;
  }
  if (lower.includes('bank') || lower.includes('transfer')) {
    return <Landmark className="w-4 h-4 text-indigo-600" />;
  }
  return <Banknote className="w-4 h-4 text-emerald-600" />;
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

  // Payment Methods Data
  const paymentMethodsBreakdown: PaymentMethodBreakdownItem[] = useMemo(() => {
    if (
      Array.isArray(data?.payment_methods_breakdown) &&
      data.payment_methods_breakdown.length > 0
    ) {
      return data.payment_methods_breakdown;
    }
    if (data?.payment_methods && typeof data.payment_methods === 'object') {
      const pm = data.payment_methods;
      const list: PaymentMethodBreakdownItem[] = [];
      const order = ['cash', 'card', 'bank_transfer'];
      for (const k of order) {
        if (pm[k]) {
          list.push(pm[k]!);
        }
      }
      for (const [k, v] of Object.entries(pm)) {
        if (!order.includes(k) && v) {
          list.push(v);
        }
      }
      if (list.length > 0) return list;
    }

    // Synthesize from total_cash, total_card, total_bank_transfer if present
    const cashVal = parseAmount(data?.total_cash);
    const cardVal = parseAmount(data?.total_card);
    const bankVal = parseAmount(data?.total_bank_transfer);
    if (cashVal > 0 || cardVal > 0 || bankVal > 0) {
      return [
        {
          name: 'Cash',
          sales: 0,
          deposits: 0,
          refunds: 0,
          total_amount: cashVal,
          total_in: cashVal,
          total_out: 0,
          net: cashVal
        },
        {
          name: 'Card',
          sales: 0,
          deposits: 0,
          refunds: 0,
          total_amount: cardVal,
          total_in: cardVal,
          total_out: 0,
          net: cardVal
        },
        {
          name: 'Bank Transfer',
          sales: 0,
          deposits: 0,
          refunds: 0,
          total_amount: bankVal,
          total_in: bankVal,
          total_out: 0,
          net: bankVal
        }
      ];
    }
    return [];
  }, [data]);

  const cashItem = useMemo(() => {
    return (
      data?.payment_methods?.cash ||
      paymentMethodsBreakdown.find((m) => m.name.toLowerCase() === 'cash')
    );
  }, [data, paymentMethodsBreakdown]);

  const cardItem = useMemo(() => {
    return (
      data?.payment_methods?.card ||
      paymentMethodsBreakdown.find((m) => m.name.toLowerCase() === 'card')
    );
  }, [data, paymentMethodsBreakdown]);

  const bankItem = useMemo(() => {
    return (
      data?.payment_methods?.bank_transfer ||
      paymentMethodsBreakdown.find(
        (m) =>
          m.name.toLowerCase().includes('bank') ||
          m.name.toLowerCase().includes('transfer')
      )
    );
  }, [data, paymentMethodsBreakdown]);

  const totalCashNum = parseAmount(
    data?.total_cash ?? cashItem?.total_in ?? cashItem?.total_amount
  );
  const totalCardNum = parseAmount(
    data?.total_card ?? cardItem?.total_in ?? cardItem?.total_amount
  );
  const totalBankNum = parseAmount(
    data?.total_bank_transfer ?? bankItem?.total_in ?? bankItem?.total_amount
  );

  const pmTableTotals = useMemo(() => {
    return paymentMethodsBreakdown.reduce(
      (acc, item) => {
        const sales = parseAmount(item.sales);
        const deposits = parseAmount(item.deposits);
        const totalIn = parseAmount(item.total_in ?? item.total_amount);
        const refunds = parseAmount(item.refunds ?? item.total_out);
        const net = parseAmount(item.net ?? (totalIn - refunds));
        return {
          sales: acc.sales + sales,
          deposits: acc.deposits + deposits,
          totalIn: acc.totalIn + totalIn,
          refunds: acc.refunds + refunds,
          net: acc.net + net
        };
      },
      { sales: 0, deposits: 0, totalIn: 0, refunds: 0, net: 0 }
    );
  }, [paymentMethodsBreakdown]);

  const dateRangeLabel =
    startDate || endDate || data?.start_date || data?.end_date
      ? `${startDate || data?.start_date || 'Start'} → ${endDate || data?.end_date || 'Today'}`
      : 'Selected date range';

  return (
    <div className="space-y-6">
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

      {/* Optional KPIs: Closed Bill Profit & Cash Register Total Money */}
      {(data?.total_closed_bill_profit != null ||
        data?.['total closed bill profit'] != null ||
        data?.total_money != null) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(data?.total_closed_bill_profit != null ||
              data?.['total closed bill profit'] != null) && (
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Total Closed Bill Profit
                    </span>
                    <div className="text-xl font-black text-slate-800 mt-0.5">
                      {formatPrice(
                        parseAmount(
                          data.total_closed_bill_profit ??
                          data['total closed bill profit']
                        )
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Rental fees + fines profit from bills closed on or before end date
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg">
                    <CircleDollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              )}
            {data?.total_money != null && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Cash Register Total Money
                  </span>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">
                    {formatPrice(parseAmount(data.total_money))}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Current net balance in active cash register
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            )}
          </div>
        )}

      {/* Row 3: Payment Methods Overview (Cash, Card, Bank Transfer) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#f5a623]" />
              Payment Methods Breakdown
            </h3>
          </div>
          {(totalCashNum > 0 || totalCardNum > 0 || totalBankNum > 0) && totalInNum > 0 && (
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full self-start sm:self-auto">
              <span>Share:</span>
              <span className="text-emerald-700 font-bold">
                Cash {Math.round((totalCashNum / totalInNum) * 100)}%
              </span>
              <span>·</span>
              <span className="text-blue-700 font-bold">
                Card {Math.round((totalCardNum / totalInNum) * 100)}%
              </span>
              <span>·</span>
              <span className="text-indigo-700 font-bold">
                Bank {Math.round((totalBankNum / totalInNum) * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* 3 Channel Cards: Cash, Card, Bank Transfer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Cash Card */}
          <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                Cash
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Inflow: {formatPrice(totalCashNum)}
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-700">
              {formatPrice(totalCashNum)}
            </div>
            <p className="text-xs text-emerald-600/80 mt-1 mb-3">
              Total Cash Inflow (Sales + Deposits)
            </p>
            <div className="border-t border-emerald-100 pt-2.5 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Sales:</span>
                <span className="font-semibold text-gray-800">
                  {formatPrice(parseAmount(cashItem?.sales))}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Deposits:</span>
                <span className="font-semibold text-gray-800">
                  {formatPrice(parseAmount(cashItem?.deposits))}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Refunds Given:</span>
                <span className="font-semibold text-rose-600">
                  {formatPrice(
                    parseAmount(cashItem?.refunds ?? cashItem?.total_out)
                  )}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-emerald-100/60 pt-1 text-emerald-900">
                <span>Net Cash:</span>
                <span>
                  {formatPrice(
                    parseAmount(
                      cashItem?.net ??
                      totalCashNum - parseAmount(cashItem?.refunds)
                    )
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Card Card */}
          <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Card
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Inflow: {formatPrice(totalCardNum)}
              </span>
            </div>
            <div className="text-2xl font-black text-blue-700">
              {formatPrice(totalCardNum)}
            </div>
            <p className="text-xs text-blue-600/80 mt-1 mb-3">
              Total Card Inflow (Sales + Deposits)
            </p>
            <div className="border-t border-blue-100 pt-2.5 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Sales:</span>
                <span className="font-semibold text-gray-800">
                  {formatPrice(parseAmount(cardItem?.sales))}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Deposits:</span>
                <span className="font-semibold text-gray-800">
                  {formatPrice(parseAmount(cardItem?.deposits))}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Refunds Given:</span>
                <span className="font-semibold text-rose-600">
                  {formatPrice(
                    parseAmount(cardItem?.refunds ?? cardItem?.total_out)
                  )}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-blue-100/60 pt-1 text-blue-900">
                <span>Net Card:</span>
                <span>
                  {formatPrice(
                    parseAmount(
                      cardItem?.net ??
                      totalCardNum - parseAmount(cardItem?.refunds)
                    )
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Bank Transfer Card */}
          <div className="bg-white rounded-xl p-5 border border-indigo-200 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-indigo-600" />
                Bank Transfer
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Inflow: {formatPrice(totalBankNum)}
              </span>
            </div>
            <div className="text-2xl font-black text-indigo-700">
              {formatPrice(totalBankNum)}
            </div>
            <p className="text-xs text-indigo-600/80 mt-1 mb-3">
              Total Bank Inflow (Sales + Deposits)
            </p>
            <div className="border-t border-indigo-100 pt-2.5 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Sales:</span>
                <span className="font-semibold text-gray-800">
                  {formatPrice(parseAmount(bankItem?.sales))}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Deposits:</span>
                <span className="font-semibold text-gray-800">
                  {formatPrice(parseAmount(bankItem?.deposits))}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Refunds Given:</span>
                <span className="font-semibold text-rose-600">
                  {formatPrice(
                    parseAmount(bankItem?.refunds ?? bankItem?.total_out)
                  )}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-indigo-100/60 pt-1 text-indigo-900">
                <span>Net Transfer:</span>
                <span>
                  {formatPrice(
                    parseAmount(
                      bankItem?.net ??
                      totalBankNum - parseAmount(bankItem?.refunds)
                    )
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Payment Methods Breakdown Table */}
        {paymentMethodsBreakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#f5a623]" />
                Payment Methods Table
              </h3>
              <span className="text-xs text-gray-500 font-medium">
                {paymentMethodsBreakdown.length} channels recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="py-2.5 px-4 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Payment Method</th>
                    <th className="py-2.5 px-4 text-right">Sales</th>
                    <th className="py-2.5 px-4 text-right">Deposits</th>
                    <th className="py-2.5 px-4 text-right">Total Money In</th>
                    <th className="py-2.5 px-4 text-right">Refunds (Out)</th>
                    <th className="py-2.5 px-4 text-right">Net Flow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paymentMethodsBreakdown.map((item, idx) => {
                    const sales = parseAmount(item.sales);
                    const deposits = parseAmount(item.deposits);
                    const totalIn = parseAmount(
                      item.total_in ?? item.total_amount
                    );
                    const refunds = parseAmount(item.refunds ?? item.total_out);
                    const net = parseAmount(item.net ?? totalIn - refunds);

                    return (
                      <tr
                        key={idx}
                        className={`${idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                          } hover:bg-orange-50/30 transition-colors`}>
                        <td className="py-2.5 px-4 text-center text-xs text-gray-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 flex items-center gap-2">
                          {getPaymentMethodIcon(item.name)}
                          <span>{item.name}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-slate-700 tabular-nums">
                          {sales > 0 ? formatPrice(sales) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-blue-700 tabular-nums">
                          {deposits > 0 ? formatPrice(deposits) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-700 tabular-nums">
                          {totalIn > 0 ? formatPrice(totalIn) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-rose-700 tabular-nums">
                          {refunds > 0 ? formatPrice(refunds) : '-'}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-black tabular-nums ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                          {formatPrice(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-gray-200 text-xs">
                    <td
                      colSpan={2}
                      className="py-3 px-4 text-right uppercase tracking-wider text-slate-600">
                      Total Across Payment Methods:
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 tabular-nums">
                      {formatPrice(pmTableTotals.sales)}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-700 tabular-nums">
                      {formatPrice(pmTableTotals.deposits)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 tabular-nums">
                      {formatPrice(pmTableTotals.totalIn)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-700 tabular-nums">
                      {formatPrice(pmTableTotals.refunds)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-black tabular-nums ${pmTableTotals.net >= 0
                          ? 'text-slate-900'
                          : 'text-rose-700'
                        }`}>
                      {formatPrice(pmTableTotals.net)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
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
