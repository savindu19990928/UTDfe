import { useState, memo } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Banknote,
  RotateCcw,
  Loader2,
  Edit,
  Eye,
  Plus,
  X,
  Ban,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bill } from '../types';
import { formatPrice, formatQuantity } from '../utils/format';

export function getRentalStatusBadge(bill: Bill) {
  if (bill.rentalStatus === 'closed') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Closed
      </span>
    );
  }

  const returnedCount = bill.items.filter((i) => i.status === 'returned').length;
  const allReturned = returnedCount === bill.items.length && bill.items.length > 0;
  const totalDeposit =
    bill.depositHistory?.reduce((s, d) => s + d.amount, 0) ||
    bill.deposit ||
    0;
  const totalFines =
    bill.fines?.reduce((s, f) => s + Number(f.fine), 0) || 0;
  const netOwed = bill.total + totalFines;
  const balance = totalDeposit - netOwed;
  const owes = balance < 0;

  if (allReturned && owes) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
        <Ban className="w-3 h-3 mr-1" />
        Unpaid
      </span>
    );
  }

  if (allReturned && !owes) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Ready to Close
      </span>
    );
  }

  if (returnedCount > 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Partial
      </span>
    );
  }

  if (bill.apiStatus === 'overdue') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
        <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
      <Clock className="w-3 h-3 mr-1" />
      Open
    </span>
  );
}

export function getPaymentMethodBadge(method?: string) {
  if (method === 'mixed') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
        Mixed Payment
      </span>
    );
  }
  if (method === 'card') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
        Card
      </span>
    );
  }
  if (method === 'bank_transfer' || method === 'transfer') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
        Bank Transfer
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
      Cash
    </span>
  );
}

export function formatDepositMethod(method?: string): string {
  if (method === 'card') return 'Card';
  if (method === 'bank_transfer' || method === 'transfer') return 'Bank Transfer';
  return 'Cash';
}

export interface RentalBillCardProps {
  bill: Bill;
  isEditing: boolean;
  onToggleEdit: (billId: string) => void;
  onViewBill: (bill: Bill) => void;
  onManualClose: (bill: Bill) => Promise<void>;
  onOpenReturnAll: (bill: Bill) => void;
  onOpenReturnSingle: (bill: Bill, itemIndex: number) => void;
  onAddDeposit: (bill: Bill, amount: number, paymentMethod?: string) => Promise<void>;
  onOpenAddItem: (bill: Bill) => void;
  actionLoading: string | null;
  actionError: string | null;
  isCardRefreshing?: boolean;
}

export const RentalBillCard = memo(function RentalBillCard({
  bill,
  isEditing,
  onToggleEdit,
  onViewBill,
  onManualClose,
  onOpenReturnAll,
  onOpenReturnSingle,
  onAddDeposit,
  onOpenAddItem,
  actionLoading,
  actionError,
  isCardRefreshing = false
}: RentalBillCardProps) {
  const [localDepositAmount, setLocalDepositAmount] = useState('');
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<
    'cash' | 'card' | 'bank_transfer'
  >('cash');

  const returnedCount = bill.items.filter((i) => i.status === 'returned').length;
  const totalDeposit =
    bill.depositHistory?.reduce((s, d) => s + d.amount, 0) ||
    bill.deposit ||
    0;
  const totalFines =
    bill.fines?.reduce((s, f) => s + Number(f.fine), 0) || 0;
  const allItemsReturned =
    returnedCount === bill.items.length && bill.items.length > 0;
  const netOwed = bill.total + totalFines;
  const balance = totalDeposit - netOwed;
  const hasOutstandingBalance = balance < 0;
  const needsPayment =
    allItemsReturned && hasOutstandingBalance && bill.rentalStatus !== 'closed';

  const isCardBusy = isCardRefreshing || (actionLoading?.includes(bill.id) ?? false);

  const handleDepositSubmit = async () => {
    const parsed = parseFloat(localDepositAmount);
    if (isNaN(parsed) || parsed <= 0) return;
    await onAddDeposit(bill, parsed, depositPaymentMethod);
    setLocalDepositAmount('');
    setDepositPaymentMethod('cash');
  };

  return (
    <div
      data-bill-id={bill.id}
      className={`bg-white rounded-xl shadow-sm border transition-shadow duration-200 ${
        isEditing
          ? 'border-blue-300 ring-2 ring-blue-100'
          : needsPayment
          ? 'border-red-200 ring-1 ring-red-100'
          : 'border-gray-200'
      }`}>
      {/* Bill Header */}
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono font-bold text-[#1a1a2e]">
              {bill.id}
            </span>
            {isCardBusy && (
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            )}
            {getRentalStatusBadge(bill)}
            {getPaymentMethodBadge(bill.paymentMethod)}
            {needsPayment && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                <Banknote className="w-3 h-3 mr-1" />
                {formatPrice(Math.abs(balance))} due
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {bill.customer.name} · {bill.customer.phone}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {bill.date} · {returnedCount}/{bill.items.length} items returned
            {(bill.nicTaken !== undefined ||
              bill.isPassportTaken !== undefined ||
              bill.isDrivingLicenceTaken !== undefined) && (
              <span
                className={`ml-2 px-1.5 py-0.5 rounded ${
                  bill.nicTaken || bill.isPassportTaken || bill.isDrivingLicenceTaken
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                Taken ID:{' '}
                {bill.nicTaken
                  ? 'NIC'
                  : bill.isPassportTaken
                  ? 'Passport'
                  : bill.isDrivingLicenceTaken
                  ? 'Driving Licence'
                  : 'None'}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <p className="text-xs text-gray-500">Subtotal</p>
            <p className="font-bold text-[#1a1a2e]">{formatPrice(bill.total)}</p>
          </div>
          {totalFines > 0 && (
            <div className="text-right mr-2">
              <p className="text-xs text-gray-500">Fines</p>
              <p className="font-bold text-red-600">{formatPrice(totalFines)}</p>
            </div>
          )}
          <div className="text-right mr-2">
            <p className="text-xs text-gray-500">Deposit</p>
            <p className="font-bold text-blue-600">
              {formatPrice(totalDeposit)}
            </p>
          </div>
          <div className="text-right mr-4">
            <p className="text-xs text-gray-500">Balance</p>
            <p
              className={`font-bold ${
                balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
              {balance >= 0
                ? formatPrice(balance)
                : `-${formatPrice(Math.abs(balance))}`}
            </p>
          </div>

          {/* Action buttons */}
          {bill.rentalStatus !== 'closed' &&
            bill.items.some((i) => i.status === 'active' && i.apiItemId) && (
              <button
                onClick={() => onOpenReturnAll(bill)}
                disabled={actionLoading === `return-all-${bill.id}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                {actionLoading === `return-all-${bill.id}` ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Returning...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" /> Return All
                  </>
                )}
              </button>
            )}

          {bill.rentalStatus !== 'closed' && allItemsReturned && (
            <button
              onClick={() => onManualClose(bill)}
              disabled={actionLoading === `close-${bill.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
              {actionLoading === `close-${bill.id}` ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Closing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Close Bill
                </>
              )}
            </button>
          )}

          <button
            onClick={() => onToggleEdit(bill.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
              isEditing
                ? 'bg-gray-200 text-gray-700'
                : needsPayment
                ? 'bg-red-600 text-white hover:bg-red-700'
                : bill.rentalStatus === 'closed'
                ? 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
            {isEditing ? (
              <>
                <X className="w-4 h-4" /> Close
              </>
            ) : needsPayment ? (
              <>
                <Banknote className="w-4 h-4" /> Settle
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" /> Edit
              </>
            )}
          </button>

          <button
            onClick={() => onViewBill(bill)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a2e] text-white rounded-lg text-sm font-bold hover:bg-[#2d4059] transition-colors">
            <Eye className="w-4 h-4" />
            Invoice
          </button>
        </div>
      </div>

      {/* Items Table */}
      <div className="border-t border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs font-medium">
            <tr>
              <th className="px-4 py-2 text-left">Item</th>
              <th className="px-4 py-2 text-center">Start</th>
              <th className="px-4 py-2 text-center">Return</th>
              <th className="px-4 py-2 text-center">Days</th>
              <th className="px-4 py-2 text-center">Qty</th>
              <th className="px-4 py-2 text-right">Rate/Day</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-center">Status</th>
              {isEditing && (
                <th className="px-4 py-2 text-center">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bill.items.map((item, idx) => {
              const unitPrice = item.product.rentPricePerDay || 0;
              const days = item.rentalDays || 1;
              const lineTotal =
                item.rentalFee !== undefined
                  ? item.rentalFee
                  : unitPrice * item.quantity * days;
              return (
                <tr
                  key={idx}
                  className={
                    item.status === 'returned' ? 'bg-green-50/50' : ''
                  }>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          item.status === 'returned'
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <span className="font-medium text-[#1a1a2e]">
                        {item.product.name}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">
                        {item.product.itemCode ||
                          item.product.barcode ||
                          ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-gray-600">
                    {item.borrowedDate || bill.date}
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs">
                    {item.status === 'returned' ? (
                      <span className="text-green-600 font-medium">
                        {item.actualReturnDate}
                      </span>
                    ) : (
                      <span className="text-gray-500">
                        {item.expectedReturnDate || '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center font-medium">
                    {days}
                  </td>
                  <td className="px-4 py-2.5 text-center font-medium">
                    {formatQuantity(item.quantity, item.product.unit)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">
                    {formatPrice(unitPrice)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-[#1a1a2e]">
                    {formatPrice(lineTotal)}
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs">
                    {item.status === 'returned' ? (
                      <span className="text-green-600 font-medium">
                        Returned
                      </span>
                    ) : (
                      <span className="text-blue-600 font-medium">
                        Open
                      </span>
                    )}
                  </td>
                  {isEditing && (
                    <td className="px-4 py-2.5 text-center">
                      {item.status === 'active' && (
                        <button
                          onClick={() => onOpenReturnSingle(bill, idx)}
                          className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-md hover:bg-blue-200 transition-colors">
                          <RotateCcw className="w-3 h-3 inline mr-1" />
                          Return
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Controls */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="p-4 border-t border-blue-100 bg-blue-50/30">
              {bill.rentalStatus !== 'closed' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Add Deposit */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <h4 className="font-bold text-xs text-gray-700 mb-2 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-green-600" />
                      Add Deposit
                    </h4>
                    {actionError && actionLoading?.includes(`deposit-${bill.id}`) && (
                      <div className="mb-2 bg-red-50 border border-red-200 rounded p-2 flex items-start gap-1.5 text-xs text-red-700">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{actionError}</span>
                      </div>
                    )}
                    {/* Payment Method Selector for Deposit */}
                    <div className="mb-2">
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setDepositPaymentMethod('cash')}
                          className={`py-1 text-xs font-bold rounded-md transition-colors ${
                            depositPaymentMethod === 'cash'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}>
                          Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepositPaymentMethod('card')}
                          className={`py-1 text-xs font-bold rounded-md transition-colors ${
                            depositPaymentMethod === 'card'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}>
                          Card
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepositPaymentMethod('bank_transfer')}
                          className={`py-1 text-xs font-bold rounded-md transition-colors ${
                            depositPaymentMethod === 'bank_transfer'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}>
                          Bank Transfer
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={localDepositAmount}
                        onChange={(e) => setLocalDepositAmount(e.target.value)}
                        placeholder="Deposit Amount"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#f5a623] outline-none"
                      />
                      <button
                        onClick={handleDepositSubmit}
                        disabled={
                          actionLoading === `deposit-${bill.id}` ||
                          !localDepositAmount
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
                        {actionLoading === `deposit-${bill.id}` && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        {actionLoading === `deposit-${bill.id}`
                          ? 'Adding...'
                          : 'Add'}
                      </button>
                    </div>
                    {bill.depositHistory && bill.depositHistory.length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                          Deposit History
                        </div>
                        {bill.depositHistory.map((d, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <span>{d.date}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                                {formatDepositMethod(d.paymentMethod || d.payment_method)}
                              </span>
                              {d.note && <span className="text-gray-400">· {d.note}</span>}
                            </span>
                            <span className="font-mono font-medium text-gray-800">
                              {formatPrice(d.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Item - opens modal */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <h4 className="font-bold text-xs text-gray-700 mb-2 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-blue-600" />
                      Add Rental Item
                    </h4>
                    <button
                      onClick={() => onOpenAddItem(bill)}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors">
                      <Plus className="w-4 h-4" />
                      Select Product
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                  <p className="text-sm text-gray-500 font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    This bill is closed. You cannot add deposits or rental items.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
