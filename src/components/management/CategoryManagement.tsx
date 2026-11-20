import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Search,
  Tag,
  Package,
  Wrench,
  X
} from 'lucide-react';
import {
  useCategoryAdmin,
  CategoryRecord,
  CategoryType
} from '../../hooks/useCategoryAdmin';
import { Pagination } from '../Pagination';

interface CategoryManagementProps {
  onCategoriesChanged?: () => void;
}

function formatDate(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}

export function CategoryManagement({
  onCategoriesChanged
}: CategoryManagementProps) {
  const [typeFilter, setTypeFilter] = useState<'' | CategoryType>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    categories,
    loading,
    error,
    totalCount,
    totalPages,
    submitting,
    actionError,
    setActionError,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory
  } = useCategoryAdmin({
    categoryType: typeFilter,
    search: debouncedSearch,
    page
  });

  const [formModal, setFormModal] = useState<{
    mode: 'create' | 'edit';
    category?: CategoryRecord;
  } | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<CategoryType>('sell');
  const [formDescription, setFormDescription] = useState('');
  const [formLocalError, setFormLocalError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CategoryRecord | null>(null);

  const openCreateModal = () => {
    setActionError(null);
    setFormLocalError(null);
    setFormName('');
    setFormType(typeFilter || 'sell');
    setFormDescription('');
    setFormModal({ mode: 'create' });
  };

  const openEditModal = (c: CategoryRecord) => {
    setActionError(null);
    setFormLocalError(null);
    setFormName(c.name);
    setFormType(c.category_type);
    setFormDescription(c.description || '');
    setFormModal({ mode: 'edit', category: c });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLocalError(null);
    setActionError(null);

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormLocalError('Category name is required.');
      return;
    }

    try {
      if (formModal?.mode === 'create') {
        await createCategory({
          name: trimmedName,
          category_type: formType,
          description: formDescription.trim()
        });
      } else if (formModal?.mode === 'edit' && formModal.category) {
        const hasProducts = formModal.category.product_count > 0;
        const payload = hasProducts
          ? {
              name: trimmedName,
              description: formDescription.trim()
            }
          : {
              name: trimmedName,
              category_type: formType,
              description: formDescription.trim()
            };
        await updateCategory(formModal.category.id, payload);
      }
      setFormModal(null);
      onCategoriesChanged?.();
    } catch {
      /* handled by hook actionError */
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      onCategoriesChanged?.();
    } catch {
      /* handled by hook actionError */
    }
  };

  const isTypeLocked =
    formModal?.mode === 'edit' &&
    (formModal.category?.product_count ?? 0) > 0;

  return (
    <div>
      {/* Filter & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {(
              [
                ['', 'All'],
                ['sell', 'Sale'],
                ['rent', 'Rental']
              ] as const
            ).map(([val, label]) => (
              <button
                key={val || 'all'}
                type="button"
                onClick={() => {
                  setTypeFilter(val);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  typeFilter === val
                    ? 'bg-[#2d4059] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#d4901e] text-[#1a1a2e] px-4 py-2.5 rounded-lg font-bold text-sm">
            <Plus className="w-4 h-4" /> New Category
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or description..."
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none text-sm"
            />
          </div>
          <button
            type="button"
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50"
            title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error banner when no modal is open */}
      {(error || (actionError && !formModal && !deleteTarget)) && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between gap-2 text-sm text-red-700">
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

      {/* Categories Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && categories.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Tag className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">No categories found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-center">Products</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((c) => {
                  const hasProducts = c.product_count > 0;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-gray-500">
                        #{c.id}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#1a1a2e]">
                        {c.name}
                      </td>
                      <td className="px-4 py-3">
                        {c.category_type === 'sell' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <Package className="w-3 h-3" />
                            Sale
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            <Wrench className="w-3 h-3" />
                            Rental
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                        {c.description || (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 tabular-nums">
                          {c.product_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(c.updated_at || c.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="p-2 text-gray-500 hover:text-[#2d4059] hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={hasProducts}
                            onClick={() => {
                              setActionError(null);
                              setDeleteTarget(c);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              hasProducts
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={
                              hasProducts
                                ? `Cannot delete: ${c.product_count} product(s) assigned`
                                : 'Delete'
                            }>
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

        {!loading && categories.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            itemLabel="categories"
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Create / Edit Category Modal */}
      {formModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitting && setFormModal(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 text-[#1a1a2e]">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a1a2e]">
                    {formModal.mode === 'create'
                      ? 'New Category'
                      : `Edit Category #${formModal.category?.id}`}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Organize sale or rental products by category.
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{formLocalError || actionError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Power Tools, Drills"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                  Category Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isTypeLocked}
                    onClick={() => setFormType('sell')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm border-2 transition-all ${
                      formType === 'sell'
                        ? 'border-amber-500 bg-amber-50 text-amber-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    } ${isTypeLocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <Package className="w-4 h-4" />
                    Sale
                  </button>
                  <button
                    type="button"
                    disabled={isTypeLocked}
                    onClick={() => setFormType('rent')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm border-2 transition-all ${
                      formType === 'rent'
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    } ${isTypeLocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <Wrench className="w-4 h-4" />
                    Rental
                  </button>
                </div>
                {isTypeLocked && (
                  <p className="text-[11px] text-amber-700 mt-1.5">
                    Category type cannot be changed because products are already
                    assigned to this category.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description of products in this category..."
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
                  className="flex-1 py-2.5 bg-[#f5a623] hover:bg-[#d4901e] disabled:opacity-60 text-[#1a1a2e] rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {formModal.mode === 'create' ? 'Create Category' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitting && setDeleteTarget(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2.5 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-[#1a1a2e]">
                Delete Category
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete category{' '}
              <span className="font-bold">{deleteTarget.name}</span>? This
              cannot be undone.
            </p>
            {actionError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2 text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
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
