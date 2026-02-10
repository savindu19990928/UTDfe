import React, { useState } from 'react';
import { Plus, Loader2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '../utils/format';
import { useExpenses } from '../hooks/useExpenses';
export function ExpenseTracker() {
  const {
    expenses,
    totalExpenses,
    loading,
    error,
    submitting,
    addExpense,
    deleteExpense,
    refetch
  } = useExpenses();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    const success = await addExpense(description, parseFloat(amount));
    if (success) {
      setIsFormOpen(false);
      setDescription('');
      setAmount('');
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2">Expenses</h1>
          <p className="text-gray-600">Track operational costs and overhead.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors">

            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#d4901e] text-[#1a1a2e] px-4 py-2.5 rounded-lg font-bold transition-colors shadow-sm">

            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Expenses</p>
          <p className="text-3xl font-bold text-[#2d4059]">
            {formatPrice(totalExpenses)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Records</p>
          <p className="text-3xl font-bold text-[#2d4059]">{expenses.length}</p>
        </div>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {isFormOpen &&
        <motion.div
          initial={{
            height: 0,
            opacity: 0
          }}
          animate={{
            height: 'auto',
            opacity: 1
          }}
          exit={{
            height: 0,
            opacity: 0
          }}
          className="overflow-hidden mb-8">

            <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-200">

              <h3 className="text-lg font-bold text-[#1a1a2e] mb-4">
                New Expense
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Description *
                  </label>
                  <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                  placeholder="e.g., Delivery Van Fuel"
                  required />

                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Amount *
                  </label>
                  <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                  required />

                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">

                  Cancel
                </button>
                <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-[#1a1a2e] text-white rounded-lg font-bold hover:bg-[#2d4059] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">

                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </motion.div>
        }
      </AnimatePresence>

      {/* Loading */}
      {loading && expenses.length === 0 &&
      <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#f5a623] animate-spin" />
          <span className="ml-3 text-gray-500 font-medium">
            Loading expenses...
          </span>
        </div>
      }

      {/* Error */}
      {error && !loading &&
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium mb-3">{error}</p>
          <button
          onClick={refetch}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">

            Retry
          </button>
        </div>
      }

      {/* List */}
      {!loading && !error &&
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Added By</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.length === 0 ?
              <tr>
                    <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-gray-500">

                      No expenses recorded yet.
                    </td>
                  </tr> :

              expenses.map((expense) =>
              <tr
                key={expense.id}
                className="hover:bg-gray-50 transition-colors">

                      <td className="px-6 py-4 text-gray-600">
                        {expense.date}
                      </td>
                      <td className="px-6 py-4 font-medium text-[#1a1a2e]">
                        {expense.description}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {expense.created_by_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        {formatPrice(expense.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                    onClick={() => deleteExpense(expense.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1">

                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
              )
              }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>);

}