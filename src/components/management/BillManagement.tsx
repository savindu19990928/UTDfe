
import React, { useState } from 'react';
import {
  ShoppingCart,
  Clock,
  Ban,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye } from
'lucide-react';
import { RentalStats, useRentals } from '../../hooks/useRentals';
import { useSales } from '../../hooks/useSales';
import { useBillAdmin } from '../../hooks/useBillAdmin';
import { formatPrice } from '../../utils/format';
import { clearCache } from '../../utils/apiCache';
import { ApiRentalStatus, Bill } from '../../types';
import { Pagination } from '../Pagination';

type Tab = 'sales' | 'rentals';
type RentalFilter = 'all' | ApiRentalStatus;

const RENTAL_FILTERS: {value: RentalFilter;label: string;}[] = [
{ value: 'all', label: 'All' },
{ value: 'active', label: 'Open' },
{ value: 'returned', label: 'Returned' },
{ value: 'overdue', label: 'Overdue' },
{ value: 'unpaid', label: 'Unpaid' },
{ value: 'closed', label: 'Closed' }];


const RENTAL_STAT_KEYS: Record<RentalFilter, keyof RentalStats> = {
  all: 'total',
  active: 'open',
  returned: 'returned',
  overdue: 'overdue',
  unpaid: 'unpaid',
  closed: 'closed'
};

const RENTAL_STATUS_LABELS: Record<ApiRentalStatus, string> = {
  active: 'Open',
  returned: 'Returned',
  overdue: 'Overdue',
  unpaid: 'Unpaid',
  closed: 'Closed'
};

export function BillManagement({
  onViewBill


}: {onViewBill: (bill: Bill) => void;}) {
  const [tab, setTab] = useState<Tab>('rentals');
  const [search, setSearch] = useState('');
  const [rentalFilter, setRentalFilter] = useState<RentalFilter>('all');
  const {
    cancelSaleBill,
    cancelRentalBill,
    submitting,
    error: actionError
  } = useBillAdmin();
  const [confirmBill, setConfirmBill] = useState<Bill | null>(null);

  const {
    rentals,
    loading: rentalsLoading,
    error: rentalsError,
    refetch: refetchRentals,
    currentPage: rentalPage,
    totalPages: rentalTotalPages,
    totalCount: rentalTotalCount,
    stats: rentalStats,
    setPage: setRentalPage
  } = useRentals({
    search: tab === 'rentals' ? search : undefined,
    status: rentalFilter,
    enabled: tab === 'rentals'
  });
  const {
    sales,
    loading: salesLoading,
    error: salesError,
    refetch: refetchSales,
    currentPage: salePage,
    totalPages: saleTotalPages,
    totalCount: saleTotalCount,
    setPage: setSalePage
  } = useSales({
    search: tab === 'sales' ? search : undefined,
    enabled: tab === 'sales'
  });

  const handleCancel = async () => {
    if (!confirmBill || !confirmBill.apiId) return;
    try {
      if (tab === 'sales') {
        await cancelSaleBill(confirmBill.apiId);
        refetchSales();
      } else {
        await cancelRentalBill(confirmBill.apiId);
        refetchRentals();
      }
      setConfirmBill(null);
    } catch {

      /* handled */}
  };

  const bills = tab === 'sales' ? sales : rentals;
  const loading = tab === 'sales' ? salesLoading : rentalsLoading;
  const error = tab === 'sales' ? salesError : rentalsError;
  const currentPage = tab === 'sales' ? salePage : rentalPage;
  const totalPages = tab === 'sales' ? saleTotalPages : rentalTotalPages;
  const totalCount = tab === 'sales' ? saleTotalCount : rentalTotalCount;
  const setPage = tab === 'sales' ? setSalePage : setRentalPage;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTab('rentals');
              setSearch('');
              setRentalPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${tab === 'rentals' ? 'bg-[#2d4059] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            
            <Clock className="w-4 h-4" /> Rental Bills
          </button>
          <button
            onClick={() => {
              setTab('sales');
              setSearch('');
              setSalePage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${tab === 'sales' ? 'bg-[#f5a623] text-[#1a1a2e]' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            
            <ShoppingCart className="w-4 h-4" /> Sale Bills
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (tab === 'sales') setSalePage(1);else
                setRentalPage(1);
              }}
              placeholder="Search bills"
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none text-sm" />
            
          </div>
          <button
            onClick={() => {
              clearCache(tab === 'sales' ? 'sales:' : 'rentals:');
              tab === 'sales' ? refetchSales() : refetchRentals();
            }}
            className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
            
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {tab === 'rentals' &&
      <div className="flex flex-wrap gap-2 mb-4" aria-label="Filter rental bills by status">
          {RENTAL_FILTERS.map((filter) => {
          const isActive = rentalFilter === filter.value;
          const count = isActive ?
          rentalTotalCount :
          rentalStats[RENTAL_STAT_KEYS[filter.value]];
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                setRentalFilter(filter.value);
                setRentalPage(1);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-bold border transition-colors flex items-center gap-2 ${
              isActive ?
              'bg-[#2d4059] text-white border-[#2d4059]' :
              'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`
              }
              aria-pressed={isActive}>
              
                {filter.label}
                {count != null &&
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs tabular-nums ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`
                }>
                
                    {count}
                  </span>
              }
              </button>);

        })}
        </div>
      }

      {(error || actionError) &&
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" /> {actionError || error}
        </div>
      }

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && bills.length === 0 ?
        <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div> :
        bills.length === 0 ?
        <div className="text-center py-16 text-gray-400">No bills found.</div> :

        <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
                <th className="px-4 py-3">Bill No.</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                {tab === 'rentals' && <th className="px-4 py-3">Status</th>}
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bills.map((b) =>
            <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-[#1a1a2e]">
                    {b.id}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.customer.name}</td>
                  <td className="px-4 py-3 text-gray-500">{b.date}</td>
                  {tab === 'rentals' &&
              <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                        {b.apiStatus ? RENTAL_STATUS_LABELS[b.apiStatus] : 'Open'}
                      </span>
                    </td>
              }
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPrice(b.total)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                    onClick={() => onViewBill(b)}
                    className="p-2 text-gray-500 hover:text-[#2d4059] hover:bg-gray-100 rounded-lg"
                    title="View">
                    
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                    onClick={() => setConfirmBill(b)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Cancel bill">
                    
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
            )}
            </tbody>
          </table>
        }
        
        {!loading && bills.length > 0 &&
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          itemLabel={tab === 'rentals' ? 'bills' : 'sales'}
          onPageChange={setPage} />

        }
      </div>

      {confirmBill &&
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2.5 rounded-full">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-[#1a1a2e]">Cancel Bill</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Cancel bill <span className="font-bold">{confirmBill.id}</span>?
              This reverts stock movements, cash transactions
              {tab === 'rentals' ? ', deposits and fines' : ''}. This cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
              onClick={() => setConfirmBill(null)}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50">
              
                Keep Bill
              </button>
              <button
              onClick={handleCancel}
              disabled={!!submitting}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg font-bold flex items-center justify-center gap-2">
              
                {submitting ?
              <Loader2 className="w-4 h-4 animate-spin" /> :

              'Cancel Bill'
              }
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}