import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Search,
  Plus,
  Trash2,
  ArrowRight,
  CheckCircle,
  User,
  AlertTriangle,
  Loader2,
  X,
  ChevronRight,
  CreditCard,
  ShoppingCart,
  Banknote,
  Landmark,
  ScanBarcode } from
'lucide-react';
import {
  useProductSearch,
  fetchProductDetails,
  lookupProductByCode } from
'../hooks/useProductSearch';
import { Product, Bill, Customer } from '../types';
import { formatPrice, toDiscountPercent } from '../utils/format';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { motion, AnimatePresence } from 'framer-motion';
interface QuickSaleProps {
  onGenerateBill: (bill: Bill) => void;
  onCancel: () => void;
}
type SaleItem = {
  product: Product;
  quantity: number;
};
type Stage = 'items' | 'payment';
export function QuickSale({ onGenerateBill, onCancel }: QuickSaleProps) {
  const [stage, setStage] = useState<Stage>('items');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  // Payment state
  const [discount, setDiscount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'card' | 'bank_transfer'>(
    'cash');
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Refs for focus management
  const productSearchRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const customerNameRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Search sale products via the dedicated search endpoint — 3+ characters
  const searchQuery =
  productSearch.trim().length >= 3 ? productSearch.trim() : undefined;
  const { results: searchResults, loading: searchLoading } = useProductSearch({
    type: 'sale',
    query: searchQuery,
    enabled: !!searchQuery
  });
  // Product being hydrated with full details after picking a search hit
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  // Barcode scan lookup in flight
  const [scanLookup, setScanLookup] = useState(false);
  // Products to show in dropdown
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    return searchResults.slice(0, 10);
  }, [searchQuery, searchResults]);
  // Helper: get total quantity already in cart for a given product
  const getUsedQty = (productId: string, excludeIndex?: number) => {
    return items.reduce((sum, item, idx) => {
      if (item.product.id === productId && idx !== excludeIndex) {
        return sum + item.quantity;
      }
      return sum;
    }, 0);
  };
  // Calculations
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.salePrice * item.quantity,
    0
  );
  const discountAmount = subtotal * ((parseFloat(discount) || 0) / 100);
  const total = subtotal - discountAmount;
  // Focus management
  useEffect(() => {
    if (stage === 'items') {
      setTimeout(() => productSearchRef.current?.focus(), 100);
    } else if (stage === 'payment') {
      setTimeout(() => discountInputRef.current?.focus(), 100);
    }
  }, [stage]);
  const handleAddProduct = async (searchProduct: Product) => {
    if (addingProductId) return;
    // Search results are lightweight — load the full record so stock limits
    // are enforced against real availability.
    setAddingProductId(searchProduct.id);
    const detailed = await fetchProductDetails(searchProduct.id);
    setAddingProductId(null);
    const product = detailed ?? searchProduct;
    // Check stock availability (stock > 0 means limited stock)
    if (product.stock != null && product.stock > 0) {
      const usedQty = getUsedQty(product.id);
      if (usedQty >= product.stock) {
        setError(`"${product.name}" is currently unavailable`);
        setProductSearch('');
        setShowProductDropdown(false);
        return;
      }
    }
    const newItem: SaleItem = {
      product,
      quantity: 1
    };
    setItems((prev) => [...prev, newItem]);
    setProductSearch('');
    setShowProductDropdown(false);
    setError(null);
    // Focus the quantity input of the new item after render
    setTimeout(() => {
      const index = items.length; // Index of the new item
      qtyRefs.current[index]?.focus();
      qtyRefs.current[index]?.select();
    }, 50);
  };
  // Enter in the search box: resolve a scanned barcode / item code against the
  // whole catalog first, then fall back to the top search hit.
  const handleSearchEnter = async () => {
    const term = productSearch.trim();
    if (!term || scanLookup || addingProductId) return;
    setScanLookup(true);
    const match = await lookupProductByCode('sale', term);
    setScanLookup(false);
    if (match) {
      handleAddProduct(match);
      return;
    }
    if (filteredProducts.length > 0) {
      handleAddProduct(filteredProducts[0]);
      return;
    }
    setError(`No product found for "${term}"`);
  };
  // Hardware scanners type into whatever has focus — funnel stray keystrokes
  // into the search box so a scan always lands in the right place.
  useEffect(() => {
    if (stage !== 'items') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;
      e.preventDefault();
      setProductSearch((prev) => prev + e.key);
      setShowProductDropdown(true);
      productSearchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stage]);
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };
  const handleItemChange = (index: number, value: string) => {
    let num = parseInt(value) || 0;
    // Enforce stock limit
    const product = items[index]?.product;
    if (product && product.stock != null) {
      const usedByOthers = getUsedQty(product.id, index);
      const maxAllowed = Math.max(0, product.stock - usedByOthers);
      if (num > maxAllowed) {
        num = maxAllowed;
      }
    }
    if (num < 0) num = 0;
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = {
        ...newItems[index],
        quantity: num
      };
      return newItems;
    });
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Global shortcuts
    if (e.key === 'End') {
      e.preventDefault();
      if (stage === 'items' && items.length > 0) setStage('payment');else
      if (stage === 'payment') handleSubmit();
    }
    // Payment stage shortcuts
    if (stage === 'payment') {
      if (e.key === '1') setPaymentMethod('cash');
      if (e.key === '2') setPaymentMethod('card');
      if (e.key === '3') setPaymentMethod('bank_transfer');
    }
  };
  const handleSubmit = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);
    const apiBody = {
      items: items.map((item) => ({
        product: parseInt(item.product.id),
        quantity: item.quantity
      })),
      total_amount: subtotal.toFixed(2),
      final_amount: total.toFixed(2),
      payment_method: paymentMethod,
      // The API stores the discount as an amount, not a percentage.
      discount: discountAmount.toFixed(2),
      customer_name: customerName.trim() || undefined
    };
    try {
      const res = await fetch(`${API_URL}sales/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiBody)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.detail || errData?.message || 'Failed to create sale'
        );
      }
      const data = await res.json();
      const billSubtotal = parseFloat(data.total_amount ?? subtotal);
      const billDiscountAmount =
      parseFloat(data.discount ?? discountAmount) || 0;
      // Map response to Bill type
      const bill: Bill = {
        id: data.bill_number || String(data.id),
        date: new Date().toLocaleDateString(),
        dueDate: '',
        customer: {
          name: data.customer_name || customerName || 'Walk-in Customer',
          phone: '-',
          address: '-'
        },
        items: items.map((item) => ({
          ...item,
          type: 'sale',
          rentalDays: undefined
        })),
        subtotal: billSubtotal,
        discount: toDiscountPercent(billDiscountAmount, billSubtotal),
        discountAmount: billDiscountAmount,
        tax: 0,
        total: parseFloat(data.final_amount ?? total),
        type: 'invoice',
        paymentMethod: paymentMethod
      };
      onGenerateBill(bill);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };
  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      onKeyDown={handleKeyDown}>
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <h1 className="text-xl font-bold text-[#1a1a2e]">Quick Sale</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${stage === 'items' ? 'bg-orange-100 text-orange-700 font-bold' : 'text-gray-400'}`}>
            
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">
              1
            </span>
            Items
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${stage === 'payment' ? 'bg-orange-100 text-orange-700 font-bold' : 'text-gray-400'}`}>
            
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">
              2
            </span>
            Payment
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
          {/* STAGE 1: ITEMS */}
          {stage === 'items' &&
          <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                  ref={productSearchRef}
                  type="text"
                  placeholder="Scan barcode or search product by name..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchEnter();
                    }
                  }}
                  className="w-full pl-10 pr-36 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-lg" />
                
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-full px-2.5 py-1">
                    {scanLookup ?
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" /> :

                  <ScanBarcode className="w-3.5 h-3.5 text-orange-500" />
                  }
                    {scanLookup ? 'Looking up…' : 'Scanner ready'}
                  </span>

                  {/* Product Dropdown */}
                  <AnimatePresence>
                    {showProductDropdown && productSearch &&
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 10
                    }}
                    animate={{
                      opacity: 1,
                      y: 0
                    }}
                    exit={{
                      opacity: 0,
                      y: 10
                    }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-30">
                    
                        {productSearch.trim().length < 3 ?
                    <div className="p-4 text-center text-gray-400 text-sm">
                            Type at least 3 characters to search...
                          </div> :
                    searchLoading ?
                    <div className="p-4 text-center text-gray-400 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />{' '}
                            Searching...
                          </div> :
                    filteredProducts.length > 0 ?
                    filteredProducts.map((product) =>
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      disabled={
                      addingProductId != null ||
                      product.stock != null &&
                      product.stock > 0 &&
                      getUsedQty(product.id) >= product.stock
                      }
                      className={`w-full text-left px-4 py-3 hover:bg-orange-50 flex items-center justify-between border-b border-gray-50 last:border-0 ${product.stock != null && product.stock > 0 && getUsedQty(product.id) >= product.stock ? 'opacity-40 cursor-not-allowed hover:bg-white' : ''}`}>
                      
                              <div>
                                <p className="font-bold text-[#1a1a2e]">
                                  {product.name}
                                </p>
                                <p className="text-xs text-gray-500 font-mono">
                                  {product.itemCode}
                                </p>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                <p className="font-bold text-orange-600">
                                  {formatPrice(product.salePrice)}
                                </p>
                                {addingProductId === product.id &&
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        }
                              </div>
                            </button>
                    ) :

                    <div className="p-4 text-center text-gray-500">
                            No sale products found
                          </div>
                    }
                      </motion.div>
                  }
                  </AnimatePresence>
                </div>
              </div>

              {/* Items Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left w-32">Code</th>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-right w-32">Price</th>
                      <th className="px-4 py-3 text-center w-24">Qty</th>
                      <th className="px-4 py-3 text-right w-32">Total</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, index) =>
                  <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-600">
                          {item.product.itemCode || '-'}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#1a1a2e]">
                          {item.product.name}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatPrice(item.product.salePrice)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                        ref={(el) => qtyRefs.current[index] = el}
                        type="number"
                        min="1"
                        max={
                        item.product.stock != null ?
                        Math.max(
                          0,
                          item.product.stock -
                          getUsedQty(item.product.id, index)
                        ) :
                        undefined
                        }
                        value={item.quantity}
                        onChange={(e) =>
                        handleItemChange(index, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault();
                            productSearchRef.current?.focus();
                          }
                        }}
                        className="w-16 text-center border border-gray-300 rounded px-1 py-1 focus:ring-2 focus:ring-orange-500 outline-none" />
                      
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#1a1a2e]">
                          {formatPrice(item.product.salePrice * item.quantity)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors">
                        
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                  )}
                    {Array.from({
                    length: Math.max(0, 8 - items.length)
                  }).map((_, i) =>
                  <tr key={`empty-${i}`} className="h-12">
                        <td className="border-b border-gray-50 border-dashed"></td>
                        <td className="border-b border-gray-50 border-dashed"></td>
                        <td className="border-b border-gray-50 border-dashed"></td>
                        <td className="border-b border-gray-50 border-dashed"></td>
                        <td className="border-b border-gray-50 border-dashed"></td>
                        <td className="border-b border-gray-50 border-dashed"></td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <span className="font-bold text-gray-700">
                    {items.length}
                  </span>{' '}
                  items added
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-2xl font-bold text-[#1a1a2e]">
                      {formatPrice(total)}
                    </p>
                  </div>
                  <button
                  onClick={() => items.length > 0 && setStage('payment')}
                  disabled={items.length === 0}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors">
                  
                    Proceed to Payment <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          }

          {/* STAGE 2: PAYMENT */}
          {stage === 'payment' &&
          <div className="flex flex-col items-center justify-center h-full p-12">
              <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="w-8 h-8 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1a1a2e]">
                    Payment Details
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Select payment method and finalize sale.
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-bold text-[#1a1a2e]">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  {/* Discount */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Discount (%)
                      </label>
                      <input
                      ref={discountInputRef}
                      type="number"
                      min="0"
                      max="100"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          customerNameRef.current?.focus();
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="0" />
                    
                    </div>
                    <div className="text-right pt-5">
                      <p className="text-xs text-gray-500">Discount Amount</p>
                      <p className="font-bold text-red-500">
                        -{formatPrice(discountAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 flex justify-between items-end">
                    <span className="text-gray-600 font-bold">Total Due</span>
                    <span className="text-3xl font-bold text-[#1a1a2e]">
                      {formatPrice(total)}
                    </span>
                  </div>

                  {/* Customer Name (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Customer Name (Optional)
                    </label>
                    <input
                    ref={customerNameRef}
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Walk-in Customer" />
                  
                  </div>

                  {/* Payment Method Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${paymentMethod === 'cash' ? 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      
                        <Banknote className="w-6 h-6 mb-1" />
                        <span className="text-xs font-bold">Cash (1)</span>
                      </button>
                      <button
                      onClick={() => setPaymentMethod('card')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${paymentMethod === 'card' ? 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      
                        <CreditCard className="w-6 h-6 mb-1" />
                        <span className="text-xs font-bold">Card (2)</span>
                      </button>
                      <button
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${paymentMethod === 'bank_transfer' ? 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      
                        <Landmark className="w-6 h-6 mb-1" />
                        <span className="text-xs font-bold">Transfer (3)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {error &&
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
              }

                <div className="flex gap-3">
                  <button
                  onClick={() => setStage('items')}
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">
                  
                    Back
                  </button>
                  <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  
                    {submitting ?
                  <>
                        <Loader2 className="w-5 h-5 animate-spin" />{' '}
                        Processing...
                      </> :

                  <>
                        <CheckCircle className="w-5 h-5" /> Complete Sale
                      </>
                  }
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        {/* Keyboard Hints */}
        <div className="mt-6 flex justify-center gap-6 text-xs text-gray-400 font-medium flex-wrap">
          <span className="flex items-center gap-1.5">
            <kbd className="bg-white border border-gray-300 rounded px-1.5 py-0.5 font-sans">
              End
            </kbd>
            Next Stage / Submit
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="bg-white border border-gray-300 rounded px-1.5 py-0.5 font-sans">
              Enter
            </kbd>
            Confirm / Next Field
          </span>
          {stage === 'payment' &&
          <span className="flex items-center gap-1.5">
              <kbd className="bg-white border border-gray-300 rounded px-1.5 py-0.5 font-sans">
                1-3
              </kbd>
              Payment Method
            </span>
          }
        </div>
      </div>
    </div>);

}