import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Package,
  X,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import {
  useStockMovements,
  StockMovement,
  MovementType
} from '../../hooks/useStockMovements';
import { useProducts } from '../../hooks/useProducts';
import { Pagination } from '../Pagination';
import {
  SearchableSelect,
  SearchableSelectOption
} from '../SearchableSelect';

function formatStockNumber(val: string | number | null | undefined): string {
  if (val == null || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/,/g, ''));
  if (!Number.isFinite(num)) return String(val);
  const normalized = Number(num.toFixed(6));
  return normalized === 0 ? '0' : String(normalized);
}

function formatDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function StockMovementsPage() {
  // Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<
    '' | MovementType
  >('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    movements,
    loading,
    error,
    totalCount,
    totalPages,
    summary,
    productDetail,
    submitting,
    actionError,
    setActionError,
    refetch,
    fetchSingleMovement,
    createMovement,
    updateMovement,
    deleteMovement
  } = useStockMovements({
    product: selectedProductId || undefined,
    movementType: movementTypeFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: debouncedSearch,
    ordering,
    page
  });

  // Load products for dropdown selectors
  const [modalProductSearch, setModalProductSearch] = useState('');
  const { products: allProducts, loading: productsLoading } = useProducts({
    search: modalProductSearch.trim() || undefined,
    includeDeactivated: true
  });

  // Create / Edit Modal state
  const [formModal, setFormModal] = useState<{
    mode: 'create' | 'edit';
    movement?: StockMovement;
  } | null>(null);
  const [formProductId, setFormProductId] = useState<string>('');
  const [formProductLabel, setFormProductLabel] = useState<string>('');
  const [formMovementType, setFormMovementType] = useState<MovementType>('in');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formReference, setFormReference] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formLocalError, setFormLocalError] = useState<string | null>(null);

  const formProductOptions: SearchableSelectOption[] = useMemo(() => {
    const opts: SearchableSelectOption[] = allProducts.map((p) => ({
      value: p.id,
      label: `${p.name}${p.itemCode ? ` (${p.itemCode})` : ''}`,
      sublabel: `Current Stock: ${formatStockNumber(p.stock)} ${
        p.unit || 'pcs'
      }`,
      searchText: `${p.name} ${p.itemCode || ''} ${p.barcode || ''} ${
        p.category || ''
      }`
    }));

    if (formProductId && !allProducts.some((p) => p.id === formProductId)) {
      opts.unshift({
        value: formProductId,
        label: formProductLabel || `Product #${formProductId}`
      });
    }
    return opts;
  }, [allProducts, formProductId, formProductLabel]);

  // View Details Modal state
  const [viewModalMovement, setViewModalMovement] =
    useState<StockMovement | null>(null);
  const [viewModalLoading, setViewModalLoading] = useState(false);

  // Delete Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState<StockMovement | null>(null);

  const openCreateModal = (defaultType: MovementType = 'in') => {
    setActionError(null);
    setFormLocalError(null);
    setFormProductId(selectedProductId || '');
    if (selectedProductId && productDetail) {
      setFormProductLabel(
        `${productDetail.product_name}${
          productDetail.item_number ? ` (${productDetail.item_number})` : ''
        }`
      );
    } else {
      setFormProductLabel('');
    }
    setModalProductSearch('');
    setFormMovementType(defaultType);
    setFormQuantity('');
    setFormReference('');
    setFormNotes('');
    setFormModal({ mode: 'create' });
  };

  const openEditModal = (m: StockMovement) => {
    setActionError(null);
    setFormLocalError(null);
    setFormProductId(String(m.product));
    setFormProductLabel(
      `${m.product_name}${
        m.product_item_number ? ` (${m.product_item_number})` : ''
      }`
    );
    setModalProductSearch('');
    setFormMovementType(m.movement_type);
    setFormQuantity(formatStockNumber(m.quantity));
    setFormReference(m.reference || '');
    setFormNotes(m.notes || '');
    setFormModal({ mode: 'edit', movement: m });
  };

  const handleOpenViewModal = async (m: StockMovement) => {
    setViewModalMovement(m);
    setViewModalLoading(true);
    const fresh = await fetchSingleMovement(m.id);
    if (fresh) {
      setViewModalMovement(fresh);
    }
    setViewModalLoading(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLocalError(null);
    setActionError(null);

    const pid = parseInt(formProductId, 10);
    if (!pid || isNaN(pid)) {
      setFormLocalError('Please select a product.');
      return;
    }

    const qty = parseFloat(formQuantity);
    if (isNaN(qty) || qty <= 0) {
      setFormLocalError('Quantity must be greater than 0.');
      return;
    }

    try {
      if (formModal?.mode === 'create') {
        await createMovement({
          product: pid,
          movement_type: formMovementType,
          quantity: qty,
          reference: formReference.trim() || undefined,
          notes: formNotes.trim() || undefined
        });
      } else if (formModal?.mode === 'edit' && formModal.movement) {
        await updateMovement(formModal.movement.id, {
          product: pid,
          movement_type: formMovementType,
          quantity: qty,
          reference: formReference.trim(),
          notes: formNotes.trim()
        });
      }
      setFormModal(null);
    } catch {
      // Error is set in hook's actionError
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMovement(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Error is set in hook's actionError
    }
  };

  const hasActiveFilters =
    !!search ||
    !!movementTypeFilter ||
    !!selectedProductId ||
    !!startDate ||
    !!endDate ||
    ordering !== '-created_at';

  const clearAllFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setMovementTypeFilter('');
    setSelectedProductId('');
    setStartDate('');
    setEndDate('');
    setOrdering('-created_at');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#f5a623]" />
            Stock Movements
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Record, edit, and audit inventory stock-in and stock-out movements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openCreateModal('in')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors">
            <ArrowDownLeft className="w-4 h-4" />
            + Stock In
          </button>
          <button
            type="button"
            onClick={() => openCreateModal('out')}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors">
            <ArrowUpRight className="w-4 h-4" />
            − Stock Out
          </button>
          <button
            type="button"
            onClick={refetch}
            className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (from GET stock-movements/summary/) */}
      {summary && (() => {
        const netVal =
          Number(
            String(
              summary.net_movement ?? summary.net_movement_formatted ?? 0
            ).replace(/,/g, '')
          ) || 0;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Movements
                </span>
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#1a1a2e]">
                {formatStockNumber(summary.total_movements ?? totalCount)}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Recorded stock transactions
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Total Stock In
                </span>
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700">
                +{formatStockNumber(summary.total_stock_in ?? summary.total_stock_in_formatted ?? 0)}
              </div>
              <p className="text-xs text-emerald-600/80 mt-1">
                Cumulative units added
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-rose-200 shadow-sm bg-gradient-to-br from-white to-rose-50/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                  Total Stock Out
                </span>
                <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-700">
                −{formatStockNumber(summary.total_stock_out ?? summary.total_stock_out_formatted ?? 0)}
              </div>
              <p className="text-xs text-rose-600/80 mt-1">
                Cumulative units deducted
              </p>
            </div>

            <div className="bg-[#1a1a2e] rounded-xl p-5 border border-slate-700 text-white shadow-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[#f5a623] uppercase tracking-wider">
                  Net Inventory Change
                </span>
                <div className="p-2 bg-[#f5a623]/20 text-[#f5a623] rounded-lg">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-2xl font-black ${
                  netVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                {netVal > 0 ? '+' : ''}
                {formatStockNumber(netVal)}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Stock In minus Stock Out
              </p>
            </div>
          </div>
        );
      })()}

      {/* Selected Product Live Stock Banner (from GET stock-movements/by_product/) */}
      {selectedProductId && productDetail && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-[#1a1a2e]">
                  {productDetail.product_name}
                </h3>
                {productDetail.item_number && (
                  <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-800">
                    {productDetail.item_number}
                  </span>
                )}
                {productDetail.category_name && (
                  <span className="text-xs text-gray-500">
                    · {productDetail.category_name}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Showing {productDetail.count} movement
                {productDetail.count !== 1 ? 's' : ''} for this product
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-3.5 py-2 rounded-lg border border-indigo-200 text-right">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">
                Current Live Stock
              </span>
              <span className="text-base font-black text-indigo-800">
                {formatStockNumber(productDetail.current_stock)}{' '}
                {productDetail.unit || 'pcs'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedProductId('');
                setPage(1);
              }}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-colors"
              title="Clear product filter">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Movement Type Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg self-start">
            {(
              [
                ['', 'All Movements'],
                ['in', 'Stock In'],
                ['out', 'Stock Out']
              ] as const
            ).map(([val, label]) => (
              <button
                key={val || 'all'}
                type="button"
                onClick={() => {
                  setMovementTypeFilter(val);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  movementTypeFilter === val
                    ? val === 'in'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : val === 'out'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-[#2d4059] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name, item code, barcode, reference, notes..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
          {/* Product Filter */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
              Product
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#f5a623] outline-none">
              <option value="">All Products</option>
              {allProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.itemCode ? `(${p.itemCode})` : ''} — Stock:{' '}
                  {formatStockNumber(p.stock)}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
              Sort By
            </label>
            <div className="flex items-center gap-2">
              <select
                value={ordering}
                onChange={(e) => {
                  setOrdering(e.target.value);
                  setPage(1);
                }}
                className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#f5a623] outline-none">
                <option value="-created_at">Newest First</option>
                <option value="created_at">Oldest First</option>
                <option value="-quantity">Highest Quantity</option>
                <option value="quantity">Lowest Quantity</option>
                <option value="movement_type">Movement Type (A–Z)</option>
                <option value="-id">ID (Descending)</option>
              </select>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg whitespace-nowrap transition-colors">
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {(error || actionError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between gap-2 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{actionError || error}</span>
          </div>
          {actionError && (
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="p-1 text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Movements Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && movements.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">
              No stock movements found.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Click &ldquo;+ Stock In&rdquo; or &ldquo;− Stock Out&rdquo; to
              record an inventory movement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3">Reference / Notes</th>
                  <th className="px-4 py-3">Recorded By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((m) => {
                  const isIn = m.movement_type === 'in';
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-gray-500">
                        #{m.id}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductId(String(m.product));
                            setPage(1);
                          }}
                          className="text-left group">
                          <div className="font-bold text-[#1a1a2e] group-hover:text-[#f5a623] transition-colors">
                            {m.product_name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            {m.product_item_number && (
                              <span className="font-mono">
                                {m.product_item_number}
                              </span>
                            )}
                            {m.product_category_name && (
                              <span>· {m.product_category_name}</span>
                            )}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isIn ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            Stock In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Stock Out
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-black tabular-nums whitespace-nowrap ${
                          isIn ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                        {isIn ? '+' : '−'}
                        {formatStockNumber(m.quantity)}{' '}
                        <span className="text-xs font-normal text-gray-400">
                          {m.product_unit || 'pcs'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">
                        {m.current_stock != null ? (
                          <>
                            {formatStockNumber(m.current_stock)}{' '}
                            <span className="text-xs font-normal text-gray-400">
                              {m.product_unit || 'pcs'}
                            </span>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {m.reference && (
                          <div className="font-semibold text-xs text-slate-800 truncate">
                            {m.reference}
                          </div>
                        )}
                        {m.notes && (
                          <div className="text-xs text-gray-500 truncate">
                            {m.notes}
                          </div>
                        )}
                        {!m.reference && !m.notes && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                          {m.created_by_name || 'admin'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(m)}
                            className="p-2 text-gray-500 hover:text-[#2d4059] hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(m)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Movement">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActionError(null);
                              setDeleteTarget(m);
                            }}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Movement">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && movements.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            itemLabel="movements"
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Add / Edit Stock Movement Modal */}
      {formModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitting && setFormModal(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-lg ${
                    formMovementType === 'in'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                  {formMovementType === 'in' ? (
                    <ArrowDownLeft className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a1a2e]">
                    {formModal.mode === 'create'
                      ? 'Record Stock Movement'
                      : `Edit Stock Movement #${formModal.movement?.id}`}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Directly updates the product&apos;s live available stock.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setFormModal(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              {(formLocalError || actionError) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formLocalError || actionError}</span>
                </div>
              )}

              {/* Movement Type Selector */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                  Movement Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormMovementType('in')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm border-2 transition-all ${
                      formMovementType === 'in'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}>
                    <ArrowDownLeft className="w-4 h-4" />
                    Stock In (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMovementType('out')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm border-2 transition-all ${
                      formMovementType === 'out'
                        ? 'border-rose-600 bg-rose-50 text-rose-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}>
                    <ArrowUpRight className="w-4 h-4" />
                    Stock Out (−)
                  </button>
                </div>
              </div>

              {/* Product Selector */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                  Product *
                </label>
                <SearchableSelect
                  value={formProductId}
                  onChange={(val) => {
                    setFormProductId(val);
                    const found = allProducts.find((p) => p.id === val);
                    if (found) {
                      setFormProductLabel(
                        `${found.name}${
                          found.itemCode ? ` (${found.itemCode})` : ''
                        }`
                      );
                    }
                  }}
                  options={formProductOptions}
                  placeholder={
                    productsLoading
                      ? 'Loading products...'
                      : '-- Select Product --'
                  }
                  searchPlaceholder="Search product name, item code, or barcode..."
                  emptyText={
                    productsLoading
                      ? 'Searching products...'
                      : 'No matching products found'
                  }
                  onSearchChange={setModalProductSearch}
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                  Quantity *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="Enter positive quantity (e.g. 10)"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none font-bold"
                />
              </div>

              {/* Reference */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                  Reference (Optional)
                </label>
                <input
                  type="text"
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  placeholder="e.g. PO-2026-004, Supplier Invoice #9910"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional remarks or audit reason..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setFormModal(null)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg font-bold text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
                    formMovementType === 'in'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {formModal.mode === 'create'
                    ? formMovementType === 'in'
                      ? 'Record Stock In'
                      : 'Record Stock Out'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Single Stock Movement Details Modal (GET stock-movements/{id}/) */}
      {viewModalMovement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewModalMovement(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-lg ${
                    viewModalMovement.movement_type === 'in'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                  {viewModalMovement.movement_type === 'in' ? (
                    <ArrowDownLeft className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a1a2e]">
                    Stock Movement #{viewModalMovement.id}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {viewModalLoading
                      ? 'Refreshing details...'
                      : formatDateTime(viewModalMovement.created_at)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewModalMovement(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">
                  Product
                </span>
                <div className="font-bold text-[#1a1a2e] text-base">
                  {viewModalMovement.product_name}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  {viewModalMovement.product_item_number && (
                    <span className="font-mono">
                      Code: {viewModalMovement.product_item_number}
                    </span>
                  )}
                  {viewModalMovement.product_category_name && (
                    <span>· {viewModalMovement.product_category_name}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Movement Quantity
                  </span>
                  <span
                    className={`text-lg font-black ${
                      viewModalMovement.movement_type === 'in'
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}>
                    {viewModalMovement.movement_type === 'in' ? '+' : '−'}
                    {formatStockNumber(viewModalMovement.quantity)}{' '}
                    {viewModalMovement.product_unit || 'pcs'}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Current Product Stock
                  </span>
                  <span className="text-lg font-black text-slate-800">
                    {viewModalMovement.current_stock != null
                      ? `${formatStockNumber(viewModalMovement.current_stock)} ${
                          viewModalMovement.product_unit || 'pcs'
                        }`
                      : '-'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">
                      Reference
                    </span>
                    <span className="font-medium text-slate-800">
                      {viewModalMovement.reference || '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-gray-200/60">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">
                      Notes
                    </span>
                    <span className="text-slate-700">
                      {viewModalMovement.notes || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  Recorded by:{' '}
                  <strong>{viewModalMovement.created_by_name || 'admin'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateTime(viewModalMovement.created_at)}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                type="button"
                onClick={() => setViewModalMovement(null)}
                className="flex-1 py-2.5 bg-white border border-gray-300 rounded-lg font-bold text-sm text-gray-700 hover:bg-gray-100">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewModalMovement;
                  setViewModalMovement(null);
                  openEditModal(target);
                }}
                className="flex-1 py-2.5 bg-[#2d4059] hover:bg-[#1a1a2e] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Movement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (DELETE stock-movements/{id}/) */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitting && setDeleteTarget(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2.5 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-[#1a1a2e]">
                Delete Stock Movement
              </h3>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Delete movement <span className="font-bold">#{deleteTarget.id}</span>{' '}
              ({deleteTarget.movement_type === 'in' ? 'Stock In' : 'Stock Out'}{' '}
              of{' '}
              <span className="font-bold">
                {formatStockNumber(deleteTarget.quantity)}{' '}
                {deleteTarget.product_unit || 'pcs'}
              </span>{' '}
              for <span className="font-bold">{deleteTarget.product_name}</span>
              )? This immediately{' '}
              {deleteTarget.movement_type === 'in' ? 'deducts' : 'restores'} the
              product&apos;s live stock and cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
