
import React, { useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  Package,
  Wrench,
  Layers,
  RefreshCw,
  Search } from
'lucide-react';
import { Product } from '../../types';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useProductAdmin } from '../../hooks/useProductAdmin';
import { formatPrice } from '../../utils/format';
import { ProductFormModal } from './ProductFormModal';
import { Pagination } from '../Pagination';

type ProductKind = 'sale' | 'rental_machines' | 'rental_bulk';
type Tab = 'sale' | 'rent';

export function ProductManagement() {
  const [tab, setTab] = useState<Tab>('sale');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { categories } = useCategories();
  const {
    products,
    loading,
    error,
    refetch,
    currentPage,
    totalPages,
    totalCount
  } = useProducts({
    categoryType: tab === 'sale' ? 'sell' : 'rent',
    search: search.trim() || undefined,
    includeDeactivated: true,
    withMachines: true,
    page
  });
  const { deleteProduct, submitting } = useProductAdmin();

  const [modal, setModal] = useState<{
    mode: 'create' | 'edit';
    kind: ProductKind;
    product?: Product | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch {

      /* handled */} finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTab('sale');
              setSearch('');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${tab === 'sale' ? 'bg-[#2d4059] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            
            <Package className="w-4 h-4" /> Sale Products
          </button>
          <button
            onClick={() => {
              setTab('rent');
              setSearch('');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${tab === 'rent' ? 'bg-[#2d4059] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            
            <Wrench className="w-4 h-4" /> Rental Products
          </button>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products"
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none text-sm" />
          
        </div>
      </div>

      {/* Create actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tab === 'sale' ?
        <button
          onClick={() => setModal({ mode: 'create', kind: 'sale' })}
          className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#d4901e] text-[#1a1a2e] px-4 py-2.5 rounded-lg font-bold text-sm">
          
            <Plus className="w-4 h-4" /> New Sale Product
          </button> :

        <>
            <button
            onClick={() => setModal({ mode: 'create', kind: 'rental_machines' })}
            className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#d4901e] text-[#1a1a2e] px-4 py-2.5 rounded-lg font-bold text-sm">
            
              <Wrench className="w-4 h-4" /> New Rental (Machines)
            </button>
            <button
            onClick={() => setModal({ mode: 'create', kind: 'rental_bulk' })}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-[#1a1a2e] px-4 py-2.5 rounded-lg font-bold text-sm">
            
              <Layers className="w-4 h-4" /> New Rental (Bulk)
            </button>
          </>
        }
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 ml-auto">
          
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error &&
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      }

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && products.length === 0 ?
        <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div> :
        products.length === 0 ?
        <div className="text-center py-16 text-gray-400">
            No products found.
          </div> :

        <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) =>
            <tr key={p.id} className={`hover:bg-gray-50 ${p.isActive === false ? 'opacity-50 bg-gray-50' : ''}`}>
                  <td className="px-4 py-3 font-bold text-[#1a1a2e]">
                    {p.name}
                    {p.isActive === false &&
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">
                        Deactivated
                      </span>
                }
                    {p.itemCode &&
                <span className="ml-2 text-xs font-mono text-gray-400">
                        {p.itemCode}
                      </span>
                }
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.category}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPrice(
                  tab === 'sale' ? p.salePrice : p.rentPricePerDay || 0
                )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.stock}
                    {p.machines && p.machines.length > 0 &&
                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {p.machines.length} machines
                      </span>
                }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                    onClick={() =>
                    setModal({
                      mode: 'edit',
                      kind: tab === 'sale' ? 'sale' : p.machines && p.machines.length > 0 ? 'rental_machines' : 'rental_bulk',
                      product: p
                    })
                    }
                    className="p-2 text-gray-500 hover:text-[#2d4059] hover:bg-gray-100 rounded-lg"
                    title="Edit">
                    
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                    onClick={() => setDeleteTarget(p)}
                    disabled={p.isActive === false}
                    className={`p-2 rounded-lg ${p.isActive === false ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}
                    title={p.isActive === false ? 'Already deactivated' : 'Delete'}>
                    
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
            )}
            </tbody>
          </table>
        }
        
        {!loading && products.length > 0 &&
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setPage} />

        }
      </div>

      {modal &&
      <ProductFormModal
        mode={modal.mode}
        kind={modal.kind}
        product={modal.product}
        categories={categories.filter((category) => {
          const expectedType = modal.kind === 'sale' ? 'sell' : 'rent';
          const isExpectedType =
          category.category_type === expectedType || !category.category_type;
          const isCurrentProductCategory =
          modal.product?.categoryId != null ?
          String(category.id) === String(modal.product.categoryId) :
          category.name.trim().toLowerCase() ===
          modal.product?.category.trim().toLowerCase();
          return isExpectedType || isCurrentProductCategory;
        })}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          refetch();
        }} />

      }

      {deleteTarget &&
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2.5 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-[#1a1a2e]">
                Delete Product
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Delete <span className="font-bold">{deleteTarget.name}</span>? If
              it has bills it will be deactivated, otherwise permanently
              removed.
            </p>
            <div className="flex gap-3">
              <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50">
              
                Cancel
              </button>
              <button
              onClick={handleDelete}
              disabled={submitting}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg font-bold flex items-center justify-center gap-2">
              
                {deletingId ?
              <Loader2 className="w-4 h-4 animate-spin" /> :

              'Delete'
              }
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}