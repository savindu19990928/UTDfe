import React, { useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  Loader2Icon,
  RotateCcwIcon } from
'lucide-react';
import { useCashRegister } from '../../hooks/useCashRegister';
import { formatPrice } from '../../utils/format';

const DENOMINATIONS = [5, 10, 20, 50, 100, 500, 1000, 2000, 5000] as const;

type Denomination = (typeof DENOMINATIONS)[number];
type DenominationCounts = Record<Denomination, string>;

interface ReconciliationResult {
  message: string;
  countedTotal: number;
  registerTotal: number;
}

const EMPTY_COUNTS: DenominationCounts = {
  5: '',
  10: '',
  20: '',
  50: '',
  100: '',
  500: '',
  1000: '',
  2000: '',
  5000: ''
};

const DEFAULT_CASH_IN_NOTES = 'Morning Cash In';

export function CashManagementPage() {
  const [counts, setCounts] = useState<DenominationCounts>(EMPTY_COUNTS);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [confirmingCashOut, setConfirmingCashOut] = useState(false);
  const [cashInAmount, setCashInAmount] = useState('');
  const [cashInNotes, setCashInNotes] = useState(DEFAULT_CASH_IN_NOTES);
  const [cashInSuccess, setCashInSuccess] = useState<string | null>(null);
  const { cashIn, cashOut, cashingIn, cashingOut, submitting, error, setError } =
  useCashRegister();

  const parsedCashInAmount = Number.parseFloat(cashInAmount);
  const canCashIn =
  Number.isFinite(parsedCashInAmount) && parsedCashInAmount > 0 && !submitting;

  const total = useMemo(
    () =>
    DENOMINATIONS.reduce(
      (sum, denomination) => sum + denomination * Number(counts[denomination] || 0),
      0
    ),
    [counts]
  );

  const updateCount = (denomination: Denomination, value: string) => {
    const normalized = value.replace(/\D/g, '');
    setCounts((current) => ({ ...current, [denomination]: normalized }));
    setResult(null);
    setError(null);
  };

  const resetCalculator = () => {
    setCounts(EMPTY_COUNTS);
    setResult(null);
    setError(null);
  };

  const handleCashIn = async () => {
    if (!canCashIn) return;
    try {
      const response = await cashIn(parsedCashInAmount, cashInNotes);
      setCashInSuccess(
        `${response.message} (${formatPrice(response.amount)})`
      );
      setCashInAmount('');
      setCashInNotes(DEFAULT_CASH_IN_NOTES);
    } catch {

      // The hook exposes the API error inline.
    }};

  const handleCashOut = async () => {
    const countedTotal = total;
    try {
      const response = await cashOut();
      setResult({
        message: response.message,
        countedTotal,
        registerTotal: response.totalCashOut
      });
      setConfirmingCashOut(false);
    } catch {

      // The hook exposes the API error inline.
    }};

  const difference = result ? result.registerTotal - result.countedTotal : 0;

  return (
    <section aria-labelledby="cash-management-title">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="cash-management-title"
            className="text-xl font-bold text-[#1a1a2e] flex items-center gap-2">
            
            <BanknoteIcon className="w-5 h-5 text-[#f5a623]" />
            Cash Management
          </h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Count the physical notes in the register, then reconcile that count when
            taking all cash out.
          </p>
        </div>
        <button
          type="button"
          onClick={resetCalculator}
          className="inline-flex items-center gap-2 self-start px-3 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50">
          
          <RotateCcwIcon className="w-4 h-4" /> Reset count
        </button>
      </div>

      {error &&
      <div role="alert" className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
          <AlertTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      }

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-[#1a1a2e]">Cash denomination calculator</h3>
            <p className="text-xs text-gray-500 mt-0.5">Enter the number of notes for every denomination.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {DENOMINATIONS.map((denomination) => {
              const lineTotal = denomination * Number(counts[denomination] || 0);
              return (
                <div key={denomination} className="grid grid-cols-[1fr_110px_1fr] items-center gap-3 px-4 py-3 sm:px-5">
                  <label htmlFor={`denomination-${denomination}`} className="font-bold text-[#1a1a2e]">
                    Rs. {denomination.toLocaleString()}
                  </label>
                  <input
                    id={`denomination-${denomination}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={counts[denomination]}
                    onChange={(event) => updateCount(denomination, event.target.value)}
                    placeholder="0"
                    aria-label={`Number of Rs. ${denomination} notes`}
                    className="w-full px-3 py-2 text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] focus:border-transparent outline-none" />
                  
                  <span className="text-right font-medium text-gray-600 tabular-nums">
                    {formatPrice(lineTotal)}
                  </span>
                </div>);

            })}
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="bg-[#1a1a2e] text-white rounded-xl p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">Physical cash counted</p>
            <p className="text-3xl font-bold mt-2 tabular-nums text-[#f5a623]">{formatPrice(total)}</p>
            <p className="text-xs text-gray-400 mt-2">Calculated locally from the note counts above.</p>
          </div>

          <form
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              handleCashIn();
            }}>
            
            <h3 className="font-bold text-[#1a1a2e] text-sm">Cash In</h3>
            <div>
              <label htmlFor="cash-in-amount" className="block text-xs font-bold text-gray-500 mb-1">
                Amount
              </label>
              <input
                id="cash-in-amount"
                type="text"
                inputMode="decimal"
                value={cashInAmount}
                onChange={(event) => {
                  const normalized = event.target.value.replace(/[^0-9.]/g, '');
                  setCashInAmount(normalized);
                  setCashInSuccess(null);
                  setError(null);
                }}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-right tabular-nums focus:ring-2 focus:ring-[#f5a623] focus:border-transparent outline-none" />
              
            </div>
            <div>
              <label htmlFor="cash-in-notes" className="block text-xs font-bold text-gray-500 mb-1">
                Notes
              </label>
              <input
                id="cash-in-notes"
                type="text"
                value={cashInNotes}
                onChange={(event) => {
                  setCashInNotes(event.target.value);
                  setCashInSuccess(null);
                  setError(null);
                }}
                placeholder={DEFAULT_CASH_IN_NOTES}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] focus:border-transparent outline-none" />
              
            </div>
            <button
              type="submit"
              disabled={!canCashIn}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2">
              
              {cashingIn ?
              <Loader2Icon className="w-4 h-4 animate-spin" /> :

              <ArrowDownToLineIcon className="w-4 h-4" />
              }
              Cash In
            </button>
            {cashInSuccess &&
            <p
              aria-live="polite"
              className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-start gap-2">
              
                <CheckCircle2Icon className="w-4 h-4 flex-shrink-0" />
                <span>{cashInSuccess}</span>
              </p>
            }
          </form>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
            <button
              type="button"
              onClick={() => setConfirmingCashOut(true)}
              disabled={submitting}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg font-bold flex items-center justify-center gap-2">
              
              {cashingOut ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <ArrowUpFromLineIcon className="w-4 h-4" />}
              Cash Out All
            </button>
          </div>

          {result &&
          <div aria-live="polite" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-start gap-2 px-4 py-3 bg-green-50 text-green-800 border-b border-green-100">
                <CheckCircle2Icon className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{result.message}</p>
              </div>
              <dl className="p-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Register cash-out</dt><dd className="font-bold tabular-nums">{formatPrice(result.registerTotal)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Physical count</dt><dd className="font-bold tabular-nums">{formatPrice(result.countedTotal)}</dd></div>
                <div className="border-t border-gray-100 pt-3 flex justify-between gap-4">
                  <dt className="font-bold text-[#1a1a2e]">{difference > 0 ? 'Missing amount' : difference < 0 ? 'Over amount' : 'Difference'}</dt>
                  <dd className={`font-bold tabular-nums ${difference === 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPrice(Math.abs(difference))}</dd>
                </div>
              </dl>
            </div>
          }
        </div>
      </div>

      {confirmingCashOut &&
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-cash-out-title">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2.5 rounded-full"><ArrowUpFromLineIcon className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 id="confirm-cash-out-title" className="text-lg font-bold text-[#1a1a2e]">Cash out active register?</h3>
                <p className="text-sm text-gray-500">Physical count: {formatPrice(total)}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">This removes the full expected balance from the active cash register and cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmingCashOut(false)} disabled={submitting} className="flex-1 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleCashOut} disabled={submitting} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                {cashingOut && <Loader2Icon className="w-4 h-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      }
    </section>);

}