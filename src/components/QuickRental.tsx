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
  Calendar,
  UserPlus,
  Camera,
  ShieldCheck } from
'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useCustomers } from '../hooks/useCustomers';
import { Product, CustomerRecord, Bill, Customer } from '../types';
import { formatPrice, getPhotoUrl } from '../utils/format';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
import { motion, AnimatePresence } from 'framer-motion';
interface QuickRentalProps {
  onGenerateBill: (bill: Bill) => void;
  onCancel: () => void;
}
type RentalItem = {
  product: Product;
  quantity: number;
  days: number;
};
type Stage = 'items' | 'deposit' | 'customer';
export function QuickRental({ onGenerateBill, onCancel }: QuickRentalProps) {
  const [stage, setStage] = useState<Stage>('items');
  const [items, setItems] = useState<RentalItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] =
  useState<CustomerRecord | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // New customer form state
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNic, setNewNic] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [newPhoneVerified, setNewPhoneVerified] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  // Refs for focus management
  const productSearchRef = useRef<HTMLInputElement>(null);
  const depositInputRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);
  const daysRefs = useRef<(HTMLInputElement | null)[]>([]);
  // New customer form refs
  const newNameRef = useRef<HTMLInputElement>(null);
  const newNicRef = useRef<HTMLInputElement>(null);
  const newPhoneRef = useRef<HTMLInputElement>(null);
  const newAddressRef = useRef<HTMLInputElement>(null);
  // Fetch rental products
  const { rentProducts } = useProducts({
    categoryType: 'rent',
    enabled: true
  });
  // Fetch customers
  const { customers, loading: customersLoading } = useCustomers({
    search: customerSearch
  });
  // Filter products locally for speed
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return rentProducts.
    filter(
      (p) =>
      p.name.toLowerCase().includes(q) ||
      p.itemCode?.toLowerCase().includes(q)
    ).
    slice(0, 10);
  }, [productSearch, rentProducts]);
  // Calculations
  const subtotal = items.reduce(
    (sum, item) =>
    sum + (item.product.rentPricePerDay || 0) * item.days * item.quantity,
    0
  );
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  // Focus management
  useEffect(() => {
    if (stage === 'items') {
      setTimeout(() => productSearchRef.current?.focus(), 100);
    } else if (stage === 'deposit') {
      setTimeout(() => depositInputRef.current?.focus(), 100);
    } else if (stage === 'customer') {
      if (showNewCustomerForm) {
        setTimeout(() => newNameRef.current?.focus(), 150);
      } else if (!selectedCustomer) {
        setTimeout(() => customerSearchRef.current?.focus(), 100);
      }
    }
  }, [stage, showNewCustomerForm, selectedCustomer]);
  // Also focus name field specifically when form toggles on
  useEffect(() => {
    if (showNewCustomerForm) {
      setTimeout(() => {
        newNameRef.current?.focus();
      }, 200);
    }
  }, [showNewCustomerForm]);
  const handleAddProduct = (product: Product) => {
    const newItem: RentalItem = {
      product,
      quantity: 1,
      days: 1
    };
    setItems((prev) => [...prev, newItem]);
    setProductSearch('');
    setShowProductDropdown(false);
    // Focus the quantity input of the new item after render
    setTimeout(() => {
      const index = items.length; // Index of the new item
      qtyRefs.current[index]?.focus();
      qtyRefs.current[index]?.select();
    }, 50);
  };
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };
  const handleItemChange = (
  index: number,
  field: 'quantity' | 'days',
  value: string) =>
  {
    const num = parseInt(value) || 0;
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = {
        ...newItems[index],
        [field]: num
      };
      return newItems;
    });
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'End') {
      e.preventDefault();
      if (stage === 'items' && items.length > 0) setStage('deposit');else
      if (stage === 'customer' && selectedCustomer)
      handleSubmitWithCustomer(selectedCustomer);
    }
    if (e.key === 'Insert' && stage === 'customer' && !selectedCustomer) {
      e.preventDefault();
      setShowNewCustomerForm(true);
      setShowCustomerDropdown(false);
    }
  };
  // Submit with explicit customer (avoids stale state issues)
  const handleSubmitWithCustomer = async (customer: CustomerRecord) => {
    if (!customer || items.length === 0) return;
    const depositVal = parseFloat(depositAmount) || 0;
    if (depositVal < total) {
      setError(`Deposit must be at least ${formatPrice(total)}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    const today = new Date().toISOString().split('T')[0];
    const apiBody = {
      customer: parseInt(customer.id),
      initial_deposit: depositVal.toFixed(2),
      initial_deposit_date: today,
      status: 'active',
      items: items.map((item) => {
        const startDate = today;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + item.days);
        return {
          rental_start_date: startDate,
          rental_end_date: endDate.toISOString().split('T')[0],
          quantity: item.quantity,
          product: parseInt(item.product.id)
        };
      }),
      payment_method: 'cash',
      discount: 0
    };
    try {
      const res = await fetch(`${API_URL}rentals/`, {
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
          errData?.detail || errData?.message || 'Failed to create rental'
        );
      }
      const data = await res.json();
      const finalCustomer: Customer = {
        name: data.customer_name || customer.name,
        phone: data.customer_mobile || customer.phone,
        address: data.customer_address || customer.address
      };
      const finalItems = (data.items || []).map((apiItem: any) => ({
        product: {
          id: String(apiItem.product),
          name: apiItem.product_name || '',
          category: 'Heavy Equipment' as any,
          listingType: 'rent' as const,
          salePrice: 0,
          rentPricePerDay: parseFloat(apiItem.price ?? 0),
          stock: 0,
          itemCode: apiItem.product_item_number || undefined
        },
        quantity: apiItem.quantity || 1,
        type: 'rent' as const,
        rentalDays: apiItem.rental_days || 1,
        borrowedDate: apiItem.rental_start_date || today,
        expectedReturnDate: apiItem.rental_end_date || '',
        status: 'active' as const
      }));
      const deposits = (data.deposit_transactions || []).
      filter((t: any) => t.transaction_type === 'deposit').
      map((t: any) => ({
        amount: parseFloat(t.amount ?? 0),
        date: t.transaction_date || today,
        note: t.notes || 'Initial Deposit'
      }));
      const bill: Bill = {
        id: data.bill_number || String(data.id),
        date: new Date().toLocaleDateString(),
        dueDate: '',
        customer: finalCustomer,
        items: finalItems,
        subtotal: parseFloat(data.total_rental_fee ?? 0),
        discount: 0,
        discountAmount: 0,
        tax: 0,
        total: parseFloat(data.total_rental_fee ?? 0),
        type: 'invoice',
        paymentMethod: 'cash',
        deposit: parseFloat(data.total_deposit ?? 0),
        depositHistory: deposits,
        customerPhotoUrl: getPhotoUrl(data.customer_photo) || customer.photoUrl,
        customerNic: data.customer_nic || customer.nicNumber,
        rentalStatus: 'open'
      };
      onGenerateBill(bill);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };
  const handleSubmit = async () => {
    if (!selectedCustomer) return;
    handleSubmitWithCustomer(selectedCustomer);
  };
  // Select existing customer and immediately generate rental
  const handleSelectAndSubmit = (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    handleSubmitWithCustomer(customer);
  };
  // Add new customer via API, then auto-submit rental
  const handleAddNewCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      setError('Name and phone number are required');
      return;
    }
    setAddingCustomer(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('name', newName.trim());
      fd.append('mobile_number', newPhone.trim());
      if (newNic.trim()) fd.append('nic', newNic.trim());
      if (newAddress.trim()) fd.append('address', newAddress.trim());
      if (newPhoto) fd.append('photo', newPhoto);
      const res = await fetch(`${API_URL}customers/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        },
        body: fd
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const msg = errData ?
        typeof errData === 'string' ?
        errData :
        Object.values(errData).flat().join(', ') :
        `Failed to create customer (${res.status})`;
        throw new Error(msg);
      }
      const data = await res.json();
      // Build CustomerRecord from API response
      const newCustomer: CustomerRecord = {
        id: String(data.id),
        name: data.name || newName,
        phone: data.mobile_number || newPhone,
        address: data.address || newAddress,
        nicNumber: data.nic || newNic || undefined,
        photoUrl: getPhotoUrl(data.photo),
        phoneVerified: data.is_verified ?? newPhoneVerified,
        isBanned: false,
        rentalCount: 0
      };
      setSelectedCustomer(newCustomer);
      setShowNewCustomerForm(false);
      setAddingCustomer(false);
      // Auto-submit rental with the new customer
      handleSubmitWithCustomer(newCustomer);
    } catch (err: any) {
      setError(err.message);
      setAddingCustomer(false);
    }
  };
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  const resetNewCustomerForm = () => {
    setShowNewCustomerForm(false);
    setNewName('');
    setNewNic('');
    setNewPhone('');
    setNewAddress('');
    setNewPhoto(null);
    setNewPhotoPreview(null);
    setNewPhoneVerified(false);
    setError(null);
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
          <h1 className="text-xl font-bold text-[#1a1a2e]">Quick Rental</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${stage === 'items' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-400'}`}>

            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">
              1
            </span>
            Items
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${stage === 'deposit' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-400'}`}>

            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">
              2
            </span>
            Deposit
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${stage === 'customer' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-400'}`}>

            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">
              3
            </span>
            Customer
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
                  placeholder="Search product by name or code..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredProducts.length > 0) {
                      e.preventDefault();
                      handleAddProduct(filteredProducts[0]);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg" />


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

                        {filteredProducts.length > 0 ?
                    filteredProducts.map((product) =>
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between border-b border-gray-50 last:border-0">

                              <div>
                                <p className="font-bold text-[#1a1a2e]">
                                  {product.name}
                                </p>
                                <p className="text-xs text-gray-500 font-mono">
                                  {product.itemCode}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-blue-600">
                                  {formatPrice(product.rentPricePerDay || 0)}
                                </p>
                                <p className="text-xs text-gray-400">/day</p>
                              </div>
                            </button>
                    ) :

                    <div className="p-4 text-center text-gray-500">
                            No rental products found
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
                      <th className="px-4 py-3 text-right w-32">Rate/Day</th>
                      <th className="px-4 py-3 text-center w-24">Qty</th>
                      <th className="px-4 py-3 text-center w-24">Days</th>
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
                          {formatPrice(item.product.rentPricePerDay || 0)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                        ref={(el) => qtyRefs.current[index] = el}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                        handleItemChange(
                          index,
                          'quantity',
                          e.target.value
                        )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault();
                            daysRefs.current[index]?.focus();
                            daysRefs.current[index]?.select();
                          }
                        }}
                        className="w-16 text-center border border-gray-300 rounded px-1 py-1 focus:ring-2 focus:ring-blue-500 outline-none" />

                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                        ref={(el) => daysRefs.current[index] = el}
                        type="number"
                        min="1"
                        value={item.days}
                        onChange={(e) =>
                        handleItemChange(index, 'days', e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault();
                            productSearchRef.current?.focus();
                          }
                        }}
                        className="w-16 text-center border border-gray-300 rounded px-1 py-1 focus:ring-2 focus:ring-blue-500 outline-none" />

                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#1a1a2e]">
                          {formatPrice(
                        (item.product.rentPricePerDay || 0) *
                        item.days *
                        item.quantity
                      )}
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
                    {/* Empty Rows */}
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
                  onClick={() => items.length > 0 && setStage('deposit')}
                  disabled={items.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors">

                    Set Deposit <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          }

          {/* STAGE 2: DEPOSIT */}
          {stage === 'deposit' &&
          <div className="flex flex-col items-center justify-center h-full p-12">
              <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1a1a2e]">
                    Security Deposit
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Enter the initial deposit amount collected.
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Rental Fee</span>
                    <span className="font-bold text-[#1a1a2e]">
                      {formatPrice(total)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Deposit Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                        Rs.
                      </span>
                      <input
                      ref={depositInputRef}
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseFloat(depositAmount) || 0;
                          if (val >= total) setStage('customer');
                        }
                      }}
                      className="w-full pl-12 pr-4 py-4 text-2xl font-bold text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0.00" />

                    </div>
                    {(parseFloat(depositAmount) || 0) < total &&
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Minimum required: {formatPrice(total)}
                      </p>
                  }
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                  onClick={() => setStage('items')}
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">

                    Back
                  </button>
                  <button
                  onClick={() => {
                    const val = parseFloat(depositAmount) || 0;
                    if (val >= total) setStage('customer');
                  }}
                  disabled={(parseFloat(depositAmount) || 0) < total}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">

                    Select Customer
                  </button>
                </div>
              </div>
            </div>
          }

          {/* STAGE 3: CUSTOMER */}
          {stage === 'customer' &&
          <div className="flex flex-col items-center justify-center h-full p-12">
              <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1a1a2e]">
                    {showNewCustomerForm ? 'New Customer' : 'Select Customer'}
                  </h2>
                  <p className="text-gray-500 mt-1">
                    {showNewCustomerForm ?
                  'Fill in details. Press Enter to move between fields.' :
                  'Search or press Insert to add new.'}
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {/* SEARCH EXISTING CUSTOMER */}
                  {!selectedCustomer && !showNewCustomerForm &&
                <motion.div
                  key="search"
                  initial={{
                    opacity: 0,
                    x: -20
                  }}
                  animate={{
                    opacity: 1,
                    x: 0
                  }}
                  exit={{
                    opacity: 0,
                    x: -20
                  }}
                  className="space-y-3">

                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                      ref={customerSearchRef}
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onKeyDown={(e) => {
                        if (
                        e.key === 'Enter' &&
                        !customersLoading &&
                        customers.length > 0)
                        {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectAndSubmit(customers[0]);
                        }
                      }}
                      placeholder="Search customer by name, phone..."
                      className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />


                        <AnimatePresence>
                          {showCustomerDropdown && customerSearch &&
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
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto z-30">

                              {customersLoading ?
                        <div className="p-4 text-center text-gray-400 flex items-center justify-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />{' '}
                                  Searching...
                                </div> :
                        customers.length > 0 ?
                        customers.map((c, idx) =>
                        <button
                          key={c.id}
                          onClick={() => handleSelectAndSubmit(c)}
                          className={`w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 border-b border-gray-50 last:border-0 ${idx === 0 ? 'bg-blue-50/50' : ''}`}>

                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                      {c.photoUrl ?
                            <img
                              src={c.photoUrl}
                              alt={c.name}
                              className="w-full h-full object-cover" /> :


                            <User className="w-full h-full p-1.5 text-gray-400" />
                            }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-[#1a1a2e]">
                                        {c.name}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {c.phone}
                                        {c.nicNumber &&
                              <span className="ml-2 text-gray-400">
                                            · {c.nicNumber}
                                          </span>
                              }
                                      </p>
                                    </div>
                                    {idx === 0 &&
                          <kbd className="text-[10px] bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-400 flex-shrink-0">
                                        Enter
                                      </kbd>
                          }
                                  </button>
                        ) :

                        <div className="p-4 text-center text-gray-500">
                                  No customers found
                                </div>
                        }
                            </motion.div>
                      }
                        </AnimatePresence>
                      </div>

                      {/* Add New Customer Button */}
                      <button
                    onClick={() => setShowNewCustomerForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors font-medium">

                        <UserPlus className="w-5 h-5" />
                        Add New Customer
                        <kbd className="text-[10px] bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-400 ml-2">
                          Insert
                        </kbd>
                      </button>
                    </motion.div>
                }

                  {/* NEW CUSTOMER FORM */}
                  {!selectedCustomer && showNewCustomerForm &&
                <motion.div
                  key="new-form"
                  initial={{
                    opacity: 0,
                    x: 20
                  }}
                  animate={{
                    opacity: 1,
                    x: 0
                  }}
                  exit={{
                    opacity: 0,
                    x: 20
                  }}
                  className="space-y-4">

                      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
                        {/* Name */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Name *
                          </label>
                          <input
                        ref={newNameRef}
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            newNicRef.current?.focus();
                          }
                        }}
                        placeholder="Customer name"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />

                        </div>

                        {/* NIC */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            NIC Number
                          </label>
                          <input
                        ref={newNicRef}
                        type="text"
                        value={newNic}
                        onChange={(e) => setNewNic(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            newPhoneRef.current?.focus();
                          }
                        }}
                        placeholder="National ID (optional)"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />

                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Phone *
                          </label>
                          <input
                        ref={newPhoneRef}
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            newAddressRef.current?.focus();
                          }
                        }}
                        placeholder="Mobile number"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />

                        </div>

                        {/* Address */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Address
                          </label>
                          <input
                        ref={newAddressRef}
                        type="text"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewCustomer();
                          }
                        }}
                        placeholder="Address (optional)"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />

                        </div>

                        {/* Optional: Photo & Phone Verified (mouse-only) */}
                        <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
                          {/* Photo Upload */}
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-blue-600 transition-colors">
                            <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden" />

                            {newPhotoPreview ?
                        <img
                          src={newPhotoPreview}
                          alt="Preview"
                          className="w-8 h-8 rounded-full object-cover border-2 border-blue-300" /> :


                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <Camera className="w-4 h-4 text-gray-400" />
                              </div>
                        }
                            <span className="text-xs">
                              {newPhoto ? 'Change Photo' : 'Add Photo'}
                            </span>
                          </label>

                          {/* Phone Verified Toggle */}
                          <button
                        type="button"
                        onClick={() =>
                        setNewPhoneVerified(!newPhoneVerified)
                        }
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors ${newPhoneVerified ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300'}`}>

                            <ShieldCheck className="w-3.5 h-3.5" />
                            {newPhoneVerified ? 'Verified' : 'Not Verified'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                }

                  {/* SELECTED CUSTOMER CARD */}
                  {selectedCustomer &&
                <motion.div
                  key="selected"
                  initial={{
                    opacity: 0,
                    scale: 0.95
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1
                  }}>

                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 relative">
                        <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        resetNewCustomerForm();
                      }}
                      className="absolute top-4 right-4 text-gray-400 hover:text-red-500">

                          <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 rounded-full bg-white border-2 border-blue-200 overflow-hidden">
                            {selectedCustomer.photoUrl ?
                        <img
                          src={selectedCustomer.photoUrl}
                          alt={selectedCustomer.name}
                          className="w-full h-full object-cover" /> :


                        <User className="w-full h-full p-3 text-gray-300" />
                        }
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-[#1a1a2e]">
                              {selectedCustomer.name}
                            </h3>
                            <p className="text-blue-600 font-medium">
                              {selectedCustomer.phone}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs uppercase">
                              NIC Number
                            </p>
                            <p className="font-medium">
                              {selectedCustomer.nicNumber || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs uppercase">
                              Address
                            </p>
                            <p className="font-medium truncate">
                              {selectedCustomer.address}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                }
                </AnimatePresence>

                {error &&
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
              }

                {(submitting || addingCustomer) &&
              <div className="flex items-center justify-center gap-3 py-4 text-blue-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium text-sm">
                      {addingCustomer ?
                  'Creating customer & generating rental...' :
                  'Generating rental...'}
                    </span>
                  </div>
              }

                <div className="flex gap-3 pt-2">
                  <button
                  onClick={() => {
                    if (showNewCustomerForm) {
                      resetNewCustomerForm();
                    } else {
                      setStage('deposit');
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">

                    Back
                  </button>

                  {showNewCustomerForm && !selectedCustomer ?
                <button
                  onClick={handleAddNewCustomer}
                  disabled={
                  !newName.trim() ||
                  !newPhone.trim() ||
                  addingCustomer ||
                  submitting
                  }
                  className="flex-1 px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">

                      {addingCustomer ?
                  <>
                          <Loader2 className="w-5 h-5 animate-spin" />{' '}
                          Creating...
                        </> :

                  <>
                          <CheckCircle className="w-5 h-5" /> Create & Generate
                        </>
                  }
                    </button> :

                <button
                  onClick={handleSubmit}
                  disabled={!selectedCustomer || submitting}
                  className="flex-1 px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">

                      {submitting ?
                  <>
                          <Loader2 className="w-5 h-5 animate-spin" />{' '}
                          Processing...
                        </> :

                  <>
                          <CheckCircle className="w-5 h-5" /> Generate Rental
                        </>
                  }
                    </button>
                }
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
          {stage === 'customer' &&
          !showNewCustomerForm &&
          !selectedCustomer &&
          <span className="flex items-center gap-1.5">
                <kbd className="bg-white border border-gray-300 rounded px-1.5 py-0.5 font-sans">
                  Insert
                </kbd>
                New Customer
              </span>
          }
        </div>
      </div>
    </div>);

}