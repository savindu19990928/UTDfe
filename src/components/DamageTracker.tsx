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
  Hash,
  CheckCircle } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts } from '../hooks/useProducts';
import { formatPrice } from '../utils/format';
import { API_URL } from '../utils/config';
import { getAuthHeaders, isSuperUser } from '../utils/auth';
import { Pagination } from './Pagination';
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
  // Machine number selection (for machine-tracked products)
  const [availableMachines, setAvailableMachines] = useState<string[]>([]);
  const [rentedOutMachines, setRentedOutMachines] = useState<string[]>([]);
  const [damagedMachines, setDamagedMachines] = useState<string[]>([]);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [machinesError, setMachinesError] = useState<string | null>(null);
  const [machineSearch, setMachineSearch] = useState('');
  const [isMachineProduct, setIsMachineProduct] = useState(false);
  // API fetch state
  const [apiDamages, setApiDamages] = useState<ApiDamageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

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
      const res = await fetch(`${API_URL}damaged-products/?page=${page}&page_size=${pageSize}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch damage reports (${res.status})`);
      }
      const data = await res.json();
      setApiDamages(data.results || []);
      setTotalCount(data.count || data.results?.length || 0);
      setTotalPages(data.total_pages || Math.ceil((data.count || 0) / pageSize) || 1);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load damage reports');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  const handleDeleteDamage = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this damage report?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`${API_URL}damaged-products/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        throw new Error(`Failed to delete damage report (${res.status})`);
      }
      // Refetch after successful deletion
      fetchDamages();
    } catch (err: any) {
      alert(err.message || 'Failed to delete damage report');
    } finally {
      setDeletingId(null);
    }
  };

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
  // Fetch machine numbers for a product being marked as damaged
  const fetchMachinesForProduct = async (product: Product) => {
    setSelectedMachines([]);
    setAvailableMachines([]);
    setRentedOutMachines([]);
    setDamagedMachines([]);
    setMachineSearch('');
    setMachinesError(null);
    setIsMachineProduct(false);
    // Products explicitly not stock-tracked never have machine numbers
    if (product.isStockTracked === false) return;
    setMachinesLoading(true);
    try {
      const res = await fetch(
        `${API_URL}products/${product.id}/available_machines/`,
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );
      if (!res.ok) {
        throw new Error(`Failed to load machine numbers (${res.status})`);
      }
      const data = await res.json();
      const available: string[] = (data?.available_machine_numbers || []).map(
        (m: any) => String(m)
      );
      const rentedOut: string[] = (data?.rented_out_machine_numbers || []).map(
        (m: any) => String(m)
      );
      const damaged: string[] = (data?.damaged_machine_numbers || []).map(
        (m: any) => String(m)
      );
      setAvailableMachines(available);
      setRentedOutMachines(rentedOut);
      setDamagedMachines(damaged);
      // A product is machine-tracked if it exposes any machine numbers
      setIsMachineProduct(
        available.length > 0 || rentedOut.length > 0 || damaged.length > 0
      );
    } catch (err: any) {
      setMachinesError(err.message || 'Failed to load machine numbers');
    } finally {
      setMachinesLoading(false);
    }
  };
  const toggleMachine = (machine: string) => {
    setSelectedMachines((prev) =>
    prev.includes(machine) ?
    prev.filter((m) => m !== machine) :
    [...prev, machine]
    );
  };
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product.id);
    setSelectedProductData(product);
    setProductSearchQuery('');
    setIsProductDropdownOpen(false);
    setSubmitError(null);
    setQty(1);
    fetchMachinesForProduct(product);
  };
  const handleClearProduct = () => {
    setSelectedProduct('');
    setSelectedProductData(null);
    setProductSearchQuery('');
    setAvailableMachines([]);
    setRentedOutMachines([]);
    setDamagedMachines([]);
    setSelectedMachines([]);
    setMachineSearch('');
    setMachinesError(null);
    setIsMachineProduct(false);
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
    // For machine-tracked products, the machine_numbers array length MUST
    // match the quantity — so quantity is derived from the selection.
    const effectiveQty = isMachineProduct ? selectedMachines.length : qty;
    if (isMachineProduct && selectedMachines.length === 0) {
      setSubmitError(
        'Please select at least one machine number to mark as damaged.'
      );
      return;
    }
    if (!isMachineProduct && (!effectiveQty || effectiveQty < 1)) {
      setSubmitError('Please enter a valid quantity.');
      return;
    }
    if (!isMachineProduct && effectiveQty > selectedProductData.stock) {
      setSubmitError(
        `Cannot add more than available stock (${selectedProductData.stock}).`
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const requestBody: any = {
        quantity: effectiveQty,
        reason: notes || 'Damaged',
        identifier
      };
      if (isMachineProduct) {
        requestBody.machine_numbers = selectedMachines;
      }
      const res = await fetch(`${API_URL}damaged-products/mark_damaged/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
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
      // Read response to capture backend ID. For machine products the API
      // returns an array of records (one per machine).
      const resData = await res.json().catch(() => null);
      const firstRecord = Array.isArray(resData) ? resData[0] : resData;
      const backendId = firstRecord?.id || firstRecord?.damage_id || null;
      // Use backend ID if available, otherwise fall back to local ID
      const newDamage: DamageRecord = {
        id: backendId ? String(backendId) : `DMG-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        damagedQty: effectiveQty,
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
    setAvailableMachines([]);
    setRentedOutMachines([]);
    setDamagedMachines([]);
    setSelectedMachines([]);
    setMachineSearch('');
    setMachinesError(null);
    setIsMachineProduct(false);
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
            Damaged Products
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
            opacity: 0,
            overflow: 'hidden'
          }}
          animate={{
            height: 'auto',
            opacity: 1,
            transitionEnd: {
              overflow: 'visible'
            }
          }}
          exit={{
            height: 0,
            opacity: 0,
            overflow: 'hidden'
          }}
          className="mb-8 relative z-20">
          
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
                  {isMachineProduct ?
                <div
                  title="Quantity is set by the machine numbers you select below"
                  className="w-full p-2.5 border border-gray-200 bg-gray-100 text-gray-600 rounded-lg font-bold select-none cursor-not-allowed">
                  
                      {selectedMachines.length}
                    </div> :

                <input
                  type="number"
                  min="1"
                  max={selectedProductData?.stock}
                  value={qty}
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 1;
                    if (val < 1) val = 1;
                    if (
                    selectedProductData?.stock != null &&
                    val > selectedProductData.stock)
                    {
                      val = selectedProductData.stock;
                    }
                    setQty(val);
                  }}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                  required />

                }
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

              {/* Machine number selection (machine-tracked products) */}
              {selectedProductData && machinesLoading &&
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading machine numbers...
                </div>
            }
              {selectedProductData && machinesError &&
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {machinesError}
                </div>
            }
              {selectedProductData && !machinesLoading && isMachineProduct &&
            <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-500">
                      Select Machine Numbers to Mark Damaged *
                    </label>
                    <div className="relative w-1/2 max-w-[220px]">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <input
                    type="text"
                    placeholder="Search machine..."
                    value={machineSearch}
                    onChange={(e) => setMachineSearch(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-[#f5a623] outline-none" />
                  
                    </div>
                  </div>
                  {availableMachines.length === 0 &&
              rentedOutMachines.length === 0 &&
              <div className="mb-2 bg-amber-50 text-amber-700 p-3 rounded-lg text-sm flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        No machines are available to mark as damaged (all are
                        already damaged).
                      </div>
              }
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto pr-1">
                    {[
                ...availableMachines,
                ...rentedOutMachines,
                ...damagedMachines].

                sort().
                filter((m) =>
                m.toLowerCase().includes(machineSearch.toLowerCase())
                ).
                map((machine) => {
                  const isRentedOut = rentedOutMachines.includes(machine);
                  const isDamaged = damagedMachines.includes(machine);
                  const isUnavailable = isDamaged;
                  const isSelected = selectedMachines.includes(machine);
                  return (
                    <button
                      key={machine}
                      type="button"
                      disabled={isUnavailable}
                      onClick={() =>
                      !isUnavailable && toggleMachine(machine)
                      }
                      title={
                      isDamaged ?
                      'Already marked as damaged' :
                      isRentedOut ?
                      'Currently rented out (can be marked as damaged)' :
                      undefined
                      }
                      className={`relative px-2 py-2.5 rounded-lg text-sm font-mono font-bold border-2 transition-colors ${isDamaged ? 'bg-red-50 border-red-200 text-red-500 cursor-not-allowed opacity-60' : isSelected ? 'bg-[#f5a623] border-[#f5a623] text-[#1a1a2e]' : isRentedOut ? 'bg-blue-50 border-blue-200 text-blue-700 hover:border-[#f5a623] hover:bg-orange-50' : 'bg-white border-gray-200 text-[#1a1a2e] hover:border-[#f5a623] hover:bg-orange-50'}`}>
                      
                            {machine}
                            {isSelected &&
                      <CheckCircle className="w-3.5 h-3.5 absolute top-1 right-1" />
                      }
                          </button>);

                })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <span className="font-bold text-[#1a1a2e]">
                      {selectedMachines.length}
                    </span>{' '}
                    machine(s) selected · quantity will be set to{' '}
                    {selectedMachines.length}
                  </p>
                </div>
            }
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
                disabled={
                submitting ||
                !selectedProductData ||
                machinesLoading ||
                isMachineProduct && selectedMachines.length === 0
                }
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
                  {isSuperUser() && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {apiDamages.length === 0 ?
              <tr>
                    <td
                  colSpan={isSuperUser() ? 7 : 6}
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
                      {isSuperUser() &&
                <td className="px-6 py-4 text-right">
                          <button
                    onClick={() => handleDeleteDamage(damage.id)}
                    disabled={deletingId === damage.id}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 disabled:opacity-50"
                    title="Delete damage report">
                    
                            {deletingId === damage.id ?
                    <Loader2 className="w-4 h-4 animate-spin" /> :

                    <Trash2 className="w-4 h-4" />
                    }
                          </button>
                        </td>
                }
                    </tr>
              )
              }
              </tbody>
            </table>
          </div>
          
          {!loading && apiDamages.length > 0 &&
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setPage} />

        }
        </div>
      }
    </div>);

}