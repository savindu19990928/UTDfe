import React, { useCallback, useEffect, useState, useRef } from 'react';
import { DamageRecord, Product } from '../types';
import {
  AlertTriangle,
  Plus,
  Search,
  Trash2,
  AlertCircle,
  Loader2,
  RefreshCw,
  User,
  Hash } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts } from '../hooks/useProducts';
import { formatPrice } from '../utils/format';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
interface ApiDamageRecord {
  id: number;
  product_name: string;
  reported_by_name: string;
  quantity: number;
  reason: string;
  identifier: string;
  reported_at: string;
  product: number;
  reported_by: number;
}
interface DamageTrackerProps {
  damages: DamageRecord[];
  onAddDamage: (damage: DamageRecord) => void;
}
export function DamageTracker({ damages, onAddDamage }: DamageTrackerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedProductData, setSelectedProductData] =
  useState<Product | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // API fetch state
  const [apiDamages, setApiDamages] = useState<ApiDamageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Search products via API across both sell + rent (no categoryType filter)
  const searchQuery =
  productSearchQuery.trim().length >= 2 ?
  productSearchQuery.trim() :
  undefined;
  const { products, loading: productsLoading } = useProducts({
    search: searchQuery,
    enabled: isFormOpen
  });
  // Fetch damaged products from API
  const fetchDamages = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_URL}damaged-products/`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch damage reports (${res.status})`);
      }
      const data = await res.json();
      setApiDamages(data.results || []);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load damage reports');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchDamages();
  }, [fetchDamages]);
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
      productDropdownRef.current &&
      !productDropdownRef.current.contains(e.target as Node))
      {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // Server already filters by search; just show what came back
  const filteredFormProducts = products;
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product.id);
    setSelectedProductData(product);
    setProductSearchQuery('');
    setIsProductDropdownOpen(false);
    setSubmitError(null);
  };
  const handleClearProduct = () => {
    setSelectedProduct('');
    setSelectedProductData(null);
    setProductSearchQuery('');
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    // Get identifier: barcode or itemCode
    const identifier = product.barcode || product.itemCode || '';
    if (!identifier) {
      setSubmitError('Selected product has no barcode or item code.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_URL}damaged-products/mark_damaged/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: qty,
          reason: notes || 'Damaged',
          identifier
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.detail ||
          errData?.message ||
          errData?.error || (
          typeof errData === 'object' ? JSON.stringify(errData) : null) ||
          `Failed to report damage (${res.status})`
        );
      }
      // Read response to capture backend ID
      const resData = await res.json().catch(() => null);
      const backendId = resData?.id || resData?.damage_id || null;
      // Use backend ID if available, otherwise fall back to local ID
      const newDamage: DamageRecord = {
        id: backendId ? String(backendId) : `DMG-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        damagedQty: qty,
        date: new Date().toISOString().split('T')[0],
        severity: 'minor',
        notes,
        estimatedLoss: 0
      };
      onAddDamage(newDamage);
      setIsFormOpen(false);
      resetForm();
      // Refetch from API to get the latest list
      fetchDamages();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit damage report');
    } finally {
      setSubmitting(false);
    }
  };
  const resetForm = () => {
    setSelectedProduct('');
    setSelectedProductData(null);
    setProductSearchQuery('');
    setQty(1);
    setNotes('');
  };
  const stats = {
    totalReports: apiDamages.length,
    totalItems: apiDamages.reduce((acc, curr) => acc + curr.quantity, 0)
  };
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2">
            Damage Reports
          </h1>
          <p className="text-gray-600">Track damaged inventory.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDamages}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#d4901e] text-[#1a1a2e] px-4 py-2.5 rounded-lg font-bold transition-colors shadow-sm">
            
            <Plus className="w-5 h-5" />
            Add Report
          </button>
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
                New Damage Report
              </h3>

              {submitError &&
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {submitError}
                </div>
            }

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Product *
                  </label>
                  <div className="relative" ref={productDropdownRef}>
                    {!selectedProductData ?
                  <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                        type="text"
                        value={productSearchQuery}
                        onChange={(e) => {
                          setProductSearchQuery(e.target.value);
                          setIsProductDropdownOpen(true);
                          setSubmitError(null);
                        }}
                        onFocus={() => setIsProductDropdownOpen(true)}
                        placeholder="Search by name, barcode, or item code..."
                        className="w-full pl-9 pr-3 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none text-sm" />
                      
                        </div>
                        <AnimatePresence>
                          {isProductDropdownOpen &&
                      <motion.div
                        initial={{
                          opacity: 0,
                          y: -4
                        }}
                        animate={{
                          opacity: 1,
                          y: 0
                        }}
                        exit={{
                          opacity: 0,
                          y: -4
                        }}
                        transition={{
                          duration: 0.15
                        }}
                        className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        
                              {productSearchQuery.trim().length < 2 ?
                        <div className="px-3 py-6 text-center text-sm text-gray-400">
                                  Type at least 2 characters to search…
                                </div> :
                        productsLoading ?
                        <div className="px-3 py-6 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Searching…
                                </div> :
                        filteredFormProducts.length > 0 ?
                        filteredFormProducts.map((p) =>
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0">
                          
                                    <div>
                                      <span className="text-sm font-bold text-[#1a1a2e]">
                                        {p.name}
                                      </span>
                                      <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>
                                          {p.barcode ?
                                p.barcode :
                                p.itemCode ?
                                p.itemCode :
                                'No code'}
                                        </span>
                                        <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.listingType === 'sale' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                
                                          {p.listingType === 'sale' ?
                                'Sale' :
                                'Rent'}
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                        ) :

                        <div className="px-3 py-6 text-center text-sm text-gray-400">
                                  No products found
                                </div>
                        }
                            </motion.div>
                      }
                        </AnimatePresence>
                      </> :

                  <div className="flex items-center justify-between bg-gray-50 p-2.5 border border-gray-200 rounded-lg">
                        <div>
                          <p className="text-sm font-bold text-[#1a1a2e]">
                            {selectedProductData.name}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {selectedProductData.barcode ||
                        selectedProductData.itemCode ||
                        'No code'}
                          </p>
                        </div>
                        <button
                      type="button"
                      onClick={handleClearProduct}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1">
                      
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                  }
                  </div>
                  {selectedProductData &&
                (() => {
                  const id =
                  selectedProductData.barcode ||
                  selectedProductData.itemCode;
                  return id ?
                  <p className="text-[10px] text-gray-400 mt-1">
                          Identifier:{' '}
                          <span className="font-mono font-medium text-gray-600">
                            {id}
                          </span>
                        </p> :

                  <p className="text-[10px] text-red-400 mt-1">
                          ⚠ No barcode/item code
                        </p>;

                })()}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Quantity *
                  </label>
                  <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value))}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                  required />
                
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Reason / Notes
                  </label>
                  <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                  placeholder="Describe the damage..." />
                
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setSubmitError(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                
                  Cancel
                </button>
                <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-[#1a1a2e] text-white rounded-lg font-bold hover:bg-[#2d4059] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Saving...' : 'Save Report'}
                </button>
              </div>
            </form>
          </motion.div>
        }
      </AnimatePresence>

      {/* Loading */}
      {loading && apiDamages.length === 0 &&
      <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#f5a623] animate-spin" />
          <span className="ml-3 text-gray-500 font-medium">
            Loading damage reports...
          </span>
        </div>
      }

      {/* Error */}
      {fetchError && !loading &&
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium mb-3">{fetchError}</p>
          <button
          onClick={fetchDamages}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">
          
            Retry
          </button>
        </div>
      }

      {/* List */}
      {!loading && !fetchError &&
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Identifier</th>
                  <th className="px-6 py-3">Qty</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Reported By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {apiDamages.length === 0 ?
              <tr>
                    <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-gray-500">
                  
                      No damage reports recorded yet.
                    </td>
                  </tr> :

              apiDamages.map((damage) =>
              <tr
                key={damage.id}
                className="hover:bg-gray-50 transition-colors">
                
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(damage.reported_at)}
                      </td>
                      <td className="px-6 py-4 font-medium text-[#1a1a2e]">
                        {damage.product_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {damage.identifier}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-orange-600">
                        {damage.quantity}
                      </td>
                      <td
                  className="px-6 py-4 text-gray-500 max-w-xs truncate"
                  title={damage.reason}>
                  
                        {damage.reason || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm">
                            {damage.reported_by_name}
                          </span>
                        </div>
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