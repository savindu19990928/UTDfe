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
  machineNumbers: string[];
};
type Stage = 'customer' | 'items' | 'deposit';
export function QuickRental({ onGenerateBill, onCancel }: QuickRentalProps) {
  const [stage, setStage] = useState<Stage>('customer');
  const [items, setItems] = useState<RentalItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] =
  useState<CustomerRecord | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Machine number selection popup state
  const [machineModalProduct, setMachineModalProduct] =
  useState<Product | null>(null);
  const [availableMachines, setAvailableMachines] = useState<string[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [machinesError, setMachinesError] = useState<string | null>(null);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [manualQuantity, setManualQuantity] = useState(1);
  // Custom bill number state
  const [customBillNumber, setCustomBillNumber] = useState('');
  const [billNumberError, setBillNumberError] = useState<string | null>(null);
  const [nicTaken, setNicTaken] = useState(false);
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
  // Search products via API — only when 3+ characters typed
  const searchQuery =
  productSearch.trim().length >= 3 ? productSearch.trim() : undefined;
  const { products: searchResults, loading: searchLoading } = useProducts({
    search: searchQuery,
    categoryType: 'rent',
    enabled: !!searchQuery
  });
  // Fetch customers
  const { customers, loading: customersLoading } = useCustomers({
    search: customerSearch
  });
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
    (sum, item) =>
    sum + (item.product.rentPricePerDay || 0) * item.days * item.quantity,
    0
  );
  const total = subtotal;
  // Focus management
  useEffect(() => {
    if (stage === 'customer') {
      if (showNewCustomerForm) {
        setTimeout(() => newNameRef.current?.focus(), 150);
      } else if (!selectedCustomer) {
        setTimeout(() => customerSearchRef.current?.focus(), 100);
      }
    } else if (stage === 'items') {
      setTimeout(() => productSearchRef.current?.focus(), 100);
    } else if (stage === 'deposit') {
      setTimeout(() => depositInputRef.current?.focus(), 100);
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
  // Open the machine-number selection popup for a product and fetch its
  // currently available machine numbers.
  const openMachineModal = async (product: Product) => {
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
    setError(null);
    setProductSearch('');
    setShowProductDropdown(false);
    setMachineModalProduct(product);
    setSelectedMachines([]);
    setAvailableMachines([]);
    setMachinesError(null);
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
      const machines: string[] = (data?.available_machine_numbers || []).map(
        (m: any) => String(m)
      );
      setAvailableMachines(machines);
    } catch (err: any) {
      setMachinesError(err.message || 'Failed to load machine numbers');
    } finally {
      setMachinesLoading(false);
    }
  };
  const closeMachineModal = () => {
    setMachineModalProduct(null);
    setAvailableMachines([]);
    setSelectedMachines([]);
    setManualQuantity(1);
    setMachinesError(null);
    setMachinesLoading(false);
  };
  const toggleMachine = (machine: string) => {
    setSelectedMachines((prev) =>
    prev.includes(machine) ?
    prev.filter((m) => m !== machine) :
    [...prev, machine]
    );
  };
  // Confirm machine selection — adds the product to the bill with the
  // selected machine numbers. Quantity is derived from machines selected.
  const confirmMachineSelection = () => {
    if (!machineModalProduct) return;
    const product = machineModalProduct;
    const isTracked =
    product.isStockTracked !== false && availableMachines.length > 0;
    if (isTracked && selectedMachines.length === 0) return;
    if (!isTracked && manualQuantity <= 0) return;
    const machineNumbers = isTracked ? [...selectedMachines] : [];
    const newItem: RentalItem = {
      product,
      quantity: isTracked ? machineNumbers.length : manualQuantity,
      days: 1,
      machineNumbers: machineNumbers.length > 0 ? machineNumbers : undefined
    };
    setItems((prev) => [...prev, newItem]);
    closeMachineModal();
    setError(null);
    // Focus the days input of the new item after render
    setTimeout(() => {
      const index = items.length; // Index of the new item
      daysRefs.current[index]?.focus();
      daysRefs.current[index]?.select();
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
    let num = parseInt(value) || 0;
    // Enforce stock limit for quantity changes
    if (field === 'quantity') {
      const product = items[index]?.product;
      if (product && product.stock != null && product.stock > 0) {
        const usedByOthers = getUsedQty(product.id, index);
        const maxAllowed = product.stock - usedByOthers;
        if (num > maxAllowed) {
          num = maxAllowed;
        }
      }
      if (num < 0) num = 0;
    }
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
      if (stage === 'customer' && selectedCustomer) setStage('items');else
      if (stage === 'items' && items.length > 0) setStage('deposit');else
      if (stage === 'deposit') handleFinalSubmit();
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
    // Validate custom bill number if provided
    if (customBillNumber.trim()) {
      const numPart = customBillNumber.trim();
      if (!/^\d{1,5}$/.test(numPart)) {
        setBillNumberError('Enter 1-5 digits (e.g. 00001)');
        return;
      }
      setBillNumberError(null);
    }
    setSubmitting(true);
    setError(null);
    const today = new Date().toISOString().split('T')[0];
    const apiBody: any = {
      customer: parseInt(customer.id),
      initial_deposit: depositVal.toFixed(2),
      initial_deposit_date: today,
      status: 'active',
      nic_taken: nicTaken,
      items: items.map((item) => {
        const startDate = today;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + item.days);
        const apiItem: any = {
          rental_start_date: startDate,
          rental_end_date: endDate.toISOString().split('T')[0],
          quantity: item.quantity,
          product: parseInt(item.product.id)
        };
        if (item.machineNumbers && item.machineNumbers.length > 0) {
          apiItem.machine_numbers = item.machineNumbers;
        }
        return apiItem;
      }),
      payment_method: 'cash',
      discount: 0
    };
    // Only send bill_number if user entered one
    if (customBillNumber.trim()) {
      const padded = customBillNumber.trim().padStart(5, '0');
      apiBody.bill_number = `RENT-${padded}`;
    }
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
        nicTaken: data.nic_taken || nicTaken,
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
  // Final submit from deposit stage
  const handleFinalSubmit = () => {
    if (!selectedCustomer || items.length === 0) return;
    const depositVal = parseFloat(depositAmount) || 0;
    if (depositVal < total) {
      setError(`Deposit must be at least ${formatPrice(total)}`);
      return;
    }
    handleSubmitWithCustomer(selectedCustomer);
  };
  // Select existing customer and move to items stage
  const handleSelectAndSubmit = (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setStage('items');
  };
  // Add new customer via API, then move to items stage
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
      // Move to items stage
      setStage('items');
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${stage === 'customer' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-400'}`}>
            
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">
              1
            </span>
            Customer
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${stage === 'items' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-400'}`}>
            
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">
              2
            </span>
            Items
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${stage === 'deposit' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-400'}`}>
            
            <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">
              3
            </span>
            Deposit
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
          {/* STAGE 1: CUSTOMER */}
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
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Name *
                          </label>
                          <input
                        ref={newNameRef}
                        autoFocus
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
                        <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
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

                {addingCustomer &&
              <div className="flex items-center justify-center gap-3 py-4 text-blue-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium text-sm">
                      Creating customer...
                    </span>
                  </div>
              }

                <div className="flex gap-3 pt-2">
                  {showNewCustomerForm && !selectedCustomer ?
                <>
                      <button
                    onClick={() => resetNewCustomerForm()}
                    className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">
                    
                        Back
                      </button>
                      <button
                    onClick={handleAddNewCustomer}
                    disabled={
                    !newName.trim() || !newPhone.trim() || addingCustomer
                    }
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    
                        {addingCustomer ?
                    <>
                            <Loader2 className="w-5 h-5 animate-spin" />{' '}
                            Creating...
                          </> :

                    <>
                            <CheckCircle className="w-5 h-5" /> Create &
                            Continue
                          </>
                    }
                      </button>
                    </> :
                selectedCustomer ?
                <button
                  onClick={() => setStage('items')}
                  className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                  
                      Add Items <ArrowRight className="w-4 h-4" />
                    </button> :
                null}
                </div>
              </div>
            </div>
          }

          {/* STAGE 2: ITEMS */}
          {stage === 'items' &&
          <div className="flex flex-col h-full">
              {/* Selected customer banner */}
              {selectedCustomer &&
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-[#1a1a2e]">
                      {selectedCustomer.name}
                    </span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">
                      {selectedCustomer.phone}
                    </span>
                  </div>
                  <button
                onClick={() => setStage('customer')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                
                    Change
                  </button>
                </div>
            }

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
                    setSelectedProductIndex(0);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedProductIndex((prev) =>
                      Math.min(prev + 1, filteredProducts.length - 1)
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedProductIndex((prev) => Math.max(prev - 1, 0));
                    } else if (
                    e.key === 'Enter' &&
                    filteredProducts.length > 0)
                    {
                      e.preventDefault();
                      const selectedProduct =
                      filteredProducts[selectedProductIndex];
                      if (selectedProduct) {
                        openMachineModal(selectedProduct);
                      }
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg" />
                
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
                    filteredProducts.map((product, idx) =>
                    <button
                      key={product.id}
                      onClick={() => openMachineModal(product)}
                      disabled={
                      product.stock != null &&
                      product.stock > 0 &&
                      getUsedQty(product.id) >= product.stock
                      }
                      className={`w-full text-left px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0 ${idx === selectedProductIndex ? 'bg-blue-50' : 'hover:bg-blue-50'} ${product.stock != null && product.stock > 0 && getUsedQty(product.id) >= product.stock ? 'opacity-40 cursor-not-allowed hover:bg-white' : ''}`}>
                      
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
                      <th className="px-4 py-3 text-center w-44">Qty / Days</th>
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
                          <div>{item.product.name}</div>
                          {item.machineNumbers.length > 0 &&
                      <div className="mt-1 flex flex-wrap gap-1">
                              {item.machineNumbers.map((m) =>
                        <span
                          key={m}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          
                                  #{m}
                                </span>
                        )}
                            </div>
                      }
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatPrice(item.product.rentPricePerDay || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="flex flex-col items-center">
                              <span
                            title="Quantity is determined by selected machine numbers"
                            className="w-14 text-center border border-gray-200 bg-gray-100 text-gray-600 rounded px-1 py-1 font-bold cursor-not-allowed select-none">
                            
                                {item.quantity}
                              </span>
                            </div>
                            <span className="text-gray-400 text-xs font-bold">
                              ×
                            </span>
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
                          className="w-14 text-center border border-gray-300 rounded px-1 py-1 focus:ring-2 focus:ring-blue-500 outline-none" />
                        
                          </div>
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
                <div className="flex items-center gap-4">
                  <button
                  onClick={() => setStage('customer')}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-sm">
                  
                    Back
                  </button>
                  <div className="text-sm text-gray-500">
                    <span className="font-bold text-gray-700">
                      {items.length}
                    </span>{' '}
                    items added
                  </div>
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

          {/* STAGE 3: DEPOSIT */}
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
                    <span className="text-gray-600">Customer</span>
                    <span className="font-bold text-[#1a1a2e]">
                      {selectedCustomer?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Items</span>
                    <span className="font-bold text-[#1a1a2e]">
                      {items.length} items
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Rental Fee</span>
                    <span className="font-bold text-[#1a1a2e]">
                      {formatPrice(total)}
                    </span>
                  </div>

                  {/* Custom Bill Number */}
                  <div className="pt-3 border-t border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Bill Number{' '}
                      <span className="text-gray-400 font-normal text-xs">
                        (optional)
                      </span>
                    </label>
                    <div className="flex items-center gap-0">
                      <span className="px-3 py-2.5 bg-gray-200 border border-r-0 border-gray-300 rounded-l-lg text-sm font-mono font-bold text-gray-600 select-none">
                        RENT-
                      </span>
                      <input
                      type="text"
                      value={customBillNumber}
                      onChange={(e) => {
                        const val = e.target.value.
                        replace(/\D/g, '').
                        slice(0, 5);
                        setCustomBillNumber(val);
                        setBillNumberError(null);
                      }}
                      placeholder="00001"
                      maxLength={5}
                      className={`flex-1 px-3 py-2.5 border rounded-r-lg text-sm font-mono font-bold focus:ring-2 outline-none ${billNumberError ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-gray-300 focus:ring-blue-500'}`} />
                    
                    </div>
                    {billNumberError &&
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {billNumberError}
                      </p>
                  }
                    <p className="text-[10px] text-gray-400 mt-1">
                      Leave empty for auto-generated number. Enter digits only
                      (e.g. 00005).
                    </p>
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
                          if (val >= total) handleFinalSubmit();
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

                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                      type="checkbox"
                      checked={nicTaken}
                      onChange={(e) => setNicTaken(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    
                      <span className="text-sm font-medium text-gray-700">
                        NIC Taken
                      </span>
                    </label>
                    <p className="text-[10px] text-gray-500 mt-1 ml-6">
                      Check this if the physical NIC card has been collected.
                    </p>
                  </div>
                </div>

                {error &&
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
              }

                {submitting &&
              <div className="flex items-center justify-center gap-3 py-4 text-blue-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium text-sm">
                      Generating rental...
                    </span>
                  </div>
              }

                <div className="flex gap-3">
                  <button
                  onClick={() => setStage('items')}
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">
                  
                    Back
                  </button>
                  <button
                  onClick={handleFinalSubmit}
                  disabled={
                  (parseFloat(depositAmount) || 0) < total || submitting
                  }
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

      {/* MACHINE NUMBER SELECTION POPUP */}
      <AnimatePresence>
        {machineModalProduct &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeMachineModal}>
          
            <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
              y: 12
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }}
            exit={{
              opacity: 0,
              scale: 0.96,
              y: 12
            }}
            transition={{
              type: 'spring',
              bounce: 0.2,
              duration: 0.4
            }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            
              <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-[#1a1a2e]">
                    Select Machine Numbers
                  </h3>
                  <p className="text-sm text-gray-500">
                    {machineModalProduct.name}
                  </p>
                </div>
                <button
                onClick={closeMachineModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close">
                
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 min-h-[140px]">
                {machineModalProduct.isStockTracked === false ||
              !machinesLoading &&
              !machinesError &&
              availableMachines.length === 0 ?
              <div>
                    {machineModalProduct.isStockTracked !== false &&
                <div className="mb-4 bg-amber-50 text-amber-700 p-3 rounded-lg text-sm flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold">No machines available</p>
                          <p className="text-xs mt-0.5">
                            You can still add this item by specifying the
                            quantity manually.
                          </p>
                        </div>
                      </div>
                }
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Quantity
                    </label>
                    <input
                  type="number"
                  min="1"
                  max={machineModalProduct.stock}
                  value={manualQuantity}
                  onChange={(e) =>
                  setManualQuantity(parseInt(e.target.value) || 1)
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f5a623] outline-none" />
                
                    <p className="text-xs text-gray-500 mt-1">
                      Available stock: {machineModalProduct.stock}
                    </p>
                  </div> :
              machinesLoading ?
              <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">
                      Loading available machines...
                    </span>
                  </div> :
              machinesError ?
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {machinesError}
                  </div> :

              <>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-3">
                      Click a number to select
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {availableMachines.map((machine) => {
                    const isSelected = selectedMachines.includes(machine);
                    return (
                      <button
                        key={machine}
                        onClick={() => toggleMachine(machine)}
                        className={`relative px-2 py-3 rounded-lg text-sm font-mono font-bold border-2 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-[#1a1a2e] hover:border-blue-400 hover:bg-blue-50'}`}>
                        
                            {machine}
                            {isSelected &&
                        <CheckCircle className="w-3.5 h-3.5 absolute top-1 right-1" />
                        }
                          </button>);

                  })}
                    </div>
                  </>
              }
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  <span className="font-bold text-[#1a1a2e]">
                    {machineModalProduct.isStockTracked === false ||
                  !machinesLoading &&
                  !machinesError &&
                  availableMachines.length === 0 ?
                  manualQuantity :
                  selectedMachines.length}
                  </span>{' '}
                  selected
                </span>
                <div className="flex items-center gap-3">
                  <button
                  onClick={closeMachineModal}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-sm">
                  
                    Cancel
                  </button>
                  <button
                  onClick={confirmMachineSelection}
                  disabled={
                  machinesLoading ||
                  machineModalProduct.isStockTracked !== false &&
                  availableMachines.length > 0 &&
                  selectedMachines.length === 0 ||
                  (machineModalProduct.isStockTracked === false ||
                  !machinesLoading && availableMachines.length === 0) &&
                  manualQuantity <= 0
                  }
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm flex items-center gap-2">
                  
                    <Plus className="w-4 h-4" />
                    Add to Bill
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}