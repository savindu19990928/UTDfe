import React, { useEffect, useState, useRef } from 'react';
import { useCart } from '../hooks/useCart';
import { useCustomers } from '../hooks/useCustomers';
import { CartItem } from './CartItem';
import {
  ShoppingBag,
  ArrowRight,
  FileText,
  User,
  ChevronDown,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Search,
  X,
  Percent,
  Trash2,
  Loader2
} from
  'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Customer, Bill, CustomerRecord, DepositEntry } from '../types';
import { formatPrice, getPhotoUrl, toDiscountPercent } from '../utils/format';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
interface CartProps {
  onGenerateBill: (bill: Bill) => void;
  onContinueShopping: () => void;
}
export function Cart({ onGenerateBill, onContinueShopping }: CartProps) {
  const { cartItems, cartTotal, cartCount, cartType, clearCart } = useCart();
  const hasRentals = cartType === 'rent';
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerData, setSelectedCustomerData] =
    useState<CustomerRecord | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'card' | 'transfer'>(
      'cash');
  // Rental payment method uses the API values directly (cash | card | transfer)
  const [rentalPaymentMethod, setRentalPaymentMethod] = useState<
    'cash' | 'card' | 'transfer'>(
      'cash');
  const [customBillNumber, setCustomBillNumber] = useState('');
  const [billNumberError, setBillNumberError] = useState<string | null>(null);
  const [nicTaken, setNicTaken] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Fetch customers from API with search
  const { customers, loading: customersLoading } = useCustomers({
    search: customerSearch
  });
  const availableCustomers = customers.filter((c) => !c.isBanned);
  useEffect(() => {
    if (!hasRentals) {
      setSelectedCustomerId('');
      setSelectedCustomerData(null);
      setCustomerSearch('');
    }
  }, [hasRentals]);
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const discountAmount = cartTotal * (discountPercent / 100);
  const afterDiscount = cartTotal - discountAmount;
  const grandTotal = afterDiscount;
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const filteredCustomers = availableCustomers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.nicNumber && c.nicNumber.toLowerCase().includes(q));

  });
  const handleSelectCustomer = (customer: CustomerRecord) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerData(customer);
    setCustomerSearch('');
    setIsCustomerDropdownOpen(false);
  };
  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setSelectedCustomerData(null);
    setCustomerSearch('');
  };
  // Validation
  const isDepositValid = hasRentals ? depositAmount >= grandTotal : true;
  const isCustomerValid = hasRentals ?
    !!selectedCustomerId && !selectedCustomerData?.isBanned :
    true;
  const isFormValid = isCustomerValid && isDepositValid;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const handleGenerateBill = async () => {
    if (!isFormValid) return;
    if (hasRentals) {
      // POST to rentals/ API
      if (!selectedCustomerData) return;
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
      setSubmitError(null);
      const today = new Date().toISOString().split('T')[0];
      const apiBody: any = {
        customer: parseInt(selectedCustomerId),
        initial_deposit: depositAmount.toFixed(2),
        initial_deposit_date: today,
        status: 'active',
        nic_taken: nicTaken,
        items: cartItems.
          filter((item) => item.type === 'rent').
          map((item) => {
            const startDate = today;
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + (item.rentalDays || 1));
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
        payment_method: rentalPaymentMethod,
        // The API stores the discount as an amount, not a percentage.
        discount: discountAmount.toFixed(2)
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
          const msg = errData ?
            typeof errData === 'string' ?
              errData :
              errData.detail ||
              errData.message ||
              Object.values(errData).flat().join(', ') :
            `Failed to create rental (${res.status})`;
          throw new Error(msg);
        }
        const data = await res.json();
        // Build Bill from API response
        const finalCustomer: Customer = {
          name: data.customer_name || selectedCustomerData.name,
          phone: data.customer_mobile || selectedCustomerData.phone,
          address: data.customer_address || selectedCustomerData.address
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
          actualReturnDate: apiItem.returned_date || undefined,
          status: apiItem.is_returned ?
            'returned' as const :
            'active' as const
        }));
        const deposits = (data.deposit_transactions || []).
          filter((t: any) => t.transaction_type === 'deposit').
          map((t: any) => ({
            amount: parseFloat(t.amount ?? 0),
            date: t.transaction_date || today,
            note: t.notes || 'Initial Deposit'
          }));
        const totalRentalFee = parseFloat(data.total_rental_fee ?? 0);
        const totalDeposit = parseFloat(data.total_deposit ?? 0);
        const billDiscountAmount = parseFloat(data.discount ?? 0) || 0;
        const subtotal = totalRentalFee + billDiscountAmount;
        const bill: Bill = {
          id: data.bill_number || String(data.id),
          date: data.created_at ?
            new Date(data.created_at).toLocaleDateString() :
            new Date().toLocaleDateString(),
          dueDate: '',
          customer: finalCustomer,
          items: finalItems,
          subtotal,
          discount: toDiscountPercent(billDiscountAmount, subtotal),
          discountAmount: billDiscountAmount,
          tax: 0,
          total: totalRentalFee,
          type: 'invoice',
          paymentMethod:
            data.payment_method as Bill['paymentMethod'] ||
            rentalPaymentMethod,
          deposit: totalDeposit,
          depositHistory: deposits,
          customerPhotoUrl:
            getPhotoUrl(data.customer_photo) ||
            selectedCustomerData.photoUrl ||
            undefined,
          customerNic:
            data.customer_nic || selectedCustomerData.nicNumber || undefined,
          nicTaken: data.nic_taken || nicTaken,
          rentalStatus: 'open'
        };
        onGenerateBill(bill);
      } catch (err: any) {
        setSubmitError(err.message || 'Failed to create rental');
        console.error('Create rental error:', err);
      } finally {
        setSubmitting(false);
      }
    } else {
      // Sale order — POST to sales/ API
      setSubmitting(true);
      setSubmitError(null);
      const apiBody = {
        total_amount: cartTotal.toFixed(2),
        // The API stores the discount as an amount, not a percentage.
        discount: discountAmount.toFixed(2),
        final_amount: grandTotal.toFixed(2),
        items: cartItems.
          filter((item) => item.type === 'sale').
          map((item) => ({
            quantity: item.quantity,
            product: parseInt(item.product.id)
          })),
        payment_method: paymentMethod
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
          const msg = errData ?
            typeof errData === 'string' ?
              errData :
              errData.detail ||
              errData.message ||
              Object.values(errData).flat().join(', ') :
            `Failed to create sale (${res.status})`;
          throw new Error(msg);
        }
        const data = await res.json();
        const finalCustomer: Customer = {
          name: 'Walk-in Customer',
          phone: '-',
          address: '-'
        };
        const finalItems = (data.items || []).map((apiItem: any) => ({
          product: {
            id: String(apiItem.product),
            name: apiItem.product_name || '',
            category: 'Heavy Equipment' as any,
            listingType: 'sale' as const,
            salePrice: parseFloat(apiItem.price ?? apiItem.unit_price ?? 0),
            rentPricePerDay: null,
            stock: 0,
            barcode: apiItem.product_barcode || undefined
          },
          quantity: apiItem.quantity || 1,
          type: 'sale' as const
        }));
        // Fallback to cart items if API doesn't return item details
        const billItems =
          finalItems.length > 0 ?
            finalItems :
            cartItems.map((item) => ({
              ...item
            }));
        const totalAmount = parseFloat(data.total_amount ?? cartTotal);
        const finalAmount = parseFloat(data.final_amount ?? grandTotal);
        const apiDiscountAmount = parseFloat(data.discount ?? discountAmount) || 0;
        const bill: Bill = {
          id:
            data.bill_number ||
            data.invoice_number ||
            String(data.id) ||
            `INV-${Date.now()}`,
          date: data.created_at ?
            new Date(data.created_at).toLocaleDateString() :
            new Date().toLocaleDateString(),
          dueDate: '',
          customer: finalCustomer,
          items: billItems,
          subtotal: totalAmount,
          discount: toDiscountPercent(apiDiscountAmount, totalAmount),
          discountAmount: apiDiscountAmount,
          tax: 0,
          total: finalAmount,
          type: 'invoice',
          paymentMethod
        };
        onGenerateBill(bill);
      } catch (err: any) {
        setSubmitError(err.message || 'Failed to create sale');
        console.error('Create sale error:', err);
      } finally {
        setSubmitting(false);
      }
    }
  };
  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="bg-gray-100 p-8 rounded-full mb-6">
          <ShoppingBag className="h-16 w-16 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">
          Your cart is empty
        </h2>
        <p className="text-gray-500 mb-8 max-w-md">
          Looks like you haven't added any tools or equipment yet. Browse our
          catalog to find what you need.
        </p>
        <button
          onClick={onContinueShopping}
          className="bg-[#f5a623] hover:bg-[#d4901e] text-[#1a1a2e] px-8 py-3 rounded-lg font-bold transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">

          Browse Products
        </button>
      </div>);

  }
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-[#1a1a2e] mb-8 flex items-center gap-3">
        Your Order
        <span className="bg-gray-100 text-gray-600 text-sm font-medium px-3 py-1 rounded-full">
          {cartCount} items
        </span>
        {cartType &&
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded ${cartType === 'sale' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>

            {cartType === 'sale' ? 'SALE ORDER' : 'RENTAL ORDER'}
          </span>
        }
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {cartItems.map((item, index) =>
              <CartItem
                key={`${item.product.id}-${item.type}`}
                item={item}
                index={index} />

            )}
          </AnimatePresence>

          <button
            onClick={onContinueShopping}
            className="flex items-center text-[#f5a623] font-medium hover:underline mt-6">

            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Continue Shopping
          </button>

          <div className="flex justify-end mt-2">
            <button
              onClick={() => {
                clearCart();
                setDiscountPercent(0);
                setDepositAmount(0);
                setSelectedCustomerId('');
                setCustomerSearch('');
              }}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-red-50">

              <Trash2 className="w-4 h-4" />
              Clear Cart
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-24">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-6">
              Order Summary
            </h2>

            {/* Totals */}
            <div className="space-y-3 mb-8 border-b border-gray-100 pb-8">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatPrice(cartTotal)}</span>
              </div>

              {/* Discount Input */}
              <div className="flex justify-between items-center text-gray-600">
                <span>Discount</span>
                <div className="flex items-center gap-1.5">
                  <div className="relative w-20">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={discountPercent || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setDiscountPercent(
                          isNaN(val) ? 0 : Math.min(100, Math.max(0, val))
                        );
                      }}
                      placeholder="0"
                      className="w-full pr-7 pl-2 py-1 text-right text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#f5a623] outline-none" />

                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  </div>
                </div>
              </div>
              {discountAmount > 0 &&
                <div className="flex justify-between text-green-600 text-sm">
                  <span>Discount ({discountPercent}%)</span>
                  <span className="font-medium">
                    -{formatPrice(discountAmount)}
                  </span>
                </div>
              }

              <div className="flex justify-between text-xl font-bold text-[#1a1a2e] pt-2">
                <span>Total</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>

              {/* Custom Bill Number — Only for Rentals */}
              {hasRentals &&
                <div className="pt-4 mt-4 border-t border-gray-200 space-y-2">
                  <label className="text-sm font-medium text-gray-600 flex items-center justify-between">
                    <span>Bill Number</span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      Optional
                    </span>
                  </label>
                  <div className="flex items-center gap-0">
                    <span className="px-2.5 py-1.5 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md text-xs font-mono font-bold text-gray-600 select-none">
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
                      className={`flex-1 px-2.5 py-1.5 border rounded-r-md text-xs font-mono font-bold focus:ring-2 outline-none ${billNumberError ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-gray-300 focus:ring-[#f5a623]'}`} />

                  </div>
                  {billNumberError &&
                    <p className="text-[10px] text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {billNumberError}
                    </p>
                  }
                  <p className="text-[10px] text-gray-400">
                    Leave empty for auto-generated number.
                  </p>
                </div>
              }

              {/* Deposit Input — Only for Rentals */}
              {hasRentals &&
                <div className="pt-4 mt-4 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="text-sm font-medium">
                      තැන්පතු මුදල (Deposit)
                    </span>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={depositAmount || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setDepositAmount(
                            isNaN(val) ? 0 : Math.max(0, Math.round(val))
                          );
                        }}
                        placeholder="0.00"
                        className="w-full pl-8 pr-2 py-1 text-right text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#f5a623] outline-none" />

                    </div>
                  </div>
                  {depositAmount > 0 &&
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        ප්‍රතිපුර්ණ මුදල (Balance)
                      </span>
                      <span
                        className={`font-bold ${depositAmount >= grandTotal ? 'text-green-600' : 'text-red-500'}`}>

                        {depositAmount >= grandTotal ?
                          formatPrice(depositAmount - grandTotal) :
                          `-${formatPrice(grandTotal - depositAmount)}`}
                      </span>
                    </div>
                  }
                  {hasRentals && depositAmount < grandTotal &&
                    <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Deposit must be at least {formatPrice(grandTotal)}
                    </p>
                  }
                </div>
              }

              {/* Payment Method — Only for Rentals */}
              {hasRentals &&
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    Payment Method
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        {
                          value: 'cash',
                          label: 'Cash'
                        },
                        {
                          value: 'card',
                          label: 'Card'
                        },
                        {
                          value: 'transfer',
                          label: 'Bank Transfer'
                        }] as
                      const).
                      map((method) =>
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setRentalPaymentMethod(method.value)}
                          className={`py-2.5 px-3 rounded-lg text-sm font-bold border transition-colors ${rentalPaymentMethod === method.value ? 'bg-[#f5a623] border-[#f5a623] text-[#1a1a2e]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>

                          {method.label}
                        </button>
                      )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    All deposits and refunds for this bill use this payment
                    method.
                  </p>
                </div>
              }

              {/* NIC Taken Checkbox — Only for Rentals */}
              {hasRentals &&
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nicTaken}
                      onChange={(e) => setNicTaken(e.target.checked)}
                      onKeyDown={(e) => {
                        if (e.key.toLowerCase() === 'n') {
                          e.preventDefault();
                          setNicTaken((prev) => !prev);
                        }
                      }}
                      className="w-4 h-4 text-[#f5a623] border-gray-300 rounded focus:ring-[#f5a623]" />

                    <span className="text-sm font-medium text-gray-700">
                      NIC Taken
                    </span>
                  </label>
                  <p className="text-[10px] text-gray-500 mt-1 ml-6">
                    Check this if the physical NIC card has been collected.
                  </p>
                </div>
              }
            </div>

            {/* Customer Details — Only for Rentals */}
            {hasRentals &&
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Customer Profile
                  </h3>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    REQUIRED
                  </span>
                </div>

                <p className="text-xs text-gray-500">
                  Rental orders require a registered customer profile.
                </p>

                {/* Searchable Customer Selector */}
                <div className="relative" ref={dropdownRef}>
                  {!selectedCustomerData ?
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setIsCustomerDropdownOpen(true);
                          }}
                          onFocus={() => setIsCustomerDropdownOpen(true)}
                          placeholder="Search by name, phone, or NIC..."
                          className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none bg-white text-sm" />

                        {customersLoading &&
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                        }
                      </div>

                      <AnimatePresence>
                        {isCustomerDropdownOpen &&
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

                            {customersLoading ?
                              <div className="px-3 py-4 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Searching...
                              </div> :
                              availableCustomers.length > 0 ?
                                availableCustomers.map((c) =>
                                  <button
                                    key={c.id}
                                    onClick={() => handleSelectCustomer(c)}
                                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0">

                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                                      {c.photoUrl ?
                                        <img
                                          src={c.photoUrl}
                                          alt={c.name}
                                          className="w-full h-full object-cover" /> :


                                        <User className="w-full h-full p-1.5 text-gray-400" />
                                      }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-bold text-[#1a1a2e] truncate">
                                          {c.name}
                                        </span>
                                        {!c.phoneVerified &&
                                          <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1 py-0.5 rounded flex-shrink-0">
                                            NOT VERIFIED
                                          </span>
                                        }
                                      </div>
                                      <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>{c.phone}</span>
                                        {c.nicNumber &&
                                          <span className="text-gray-400">
                                            · {c.nicNumber}
                                          </span>
                                        }
                                      </div>
                                    </div>
                                  </button>
                                ) :

                                <div className="px-3 py-6 text-center text-sm text-gray-400">
                                  No customers found
                                </div>
                            }
                          </motion.div>
                        }
                      </AnimatePresence>
                    </> :

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                        {selectedCustomerData.photoUrl ?
                          <img
                            src={selectedCustomerData.photoUrl}
                            alt="Customer"
                            className="w-full h-full object-cover" /> :


                          <User className="w-full h-full p-2 text-gray-400" />
                        }
                      </div>
                      <div className="text-sm flex-1">
                        <p className="font-bold text-[#1a1a2e]">
                          {selectedCustomerData.name}
                        </p>
                        <p className="text-gray-500 flex items-center gap-1">
                          {selectedCustomerData.phone}
                          {selectedCustomerData.phoneVerified ?
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" /> :

                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-1">
                              NOT VERIFIED
                            </span>
                          }
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {selectedCustomerData.address}
                        </p>
                      </div>
                      <button
                        onClick={handleClearCustomer}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Change customer">

                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  }
                </div>
              </div>
            }

            {/* Sale-only: no customer needed */}
            {!hasRentals &&
              <div className="mb-8 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                    Payment Method
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        {
                          value: 'cash',
                          label: 'Cash'
                        },
                        {
                          value: 'card',
                          label: 'Card'
                        },
                        {
                          value: 'transfer',
                          label: 'Transfer'
                        }] as
                      const).
                      map((method) =>
                        <button
                          key={method.value}
                          onClick={() => setPaymentMethod(method.value)}
                          className={`py-2.5 px-3 rounded-lg text-sm font-bold border transition-colors ${paymentMethod === method.value ? 'bg-[#f5a623] border-[#f5a623] text-[#1a1a2e]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>

                          {method.label}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            }

            {/* Action Button */}
            {submitError &&
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            }
            <button
              onClick={handleGenerateBill}
              disabled={!isFormValid || submitting}
              className="w-full bg-[#f5a623] hover:bg-[#d4901e] disabled:bg-gray-300 disabled:cursor-not-allowed text-[#1a1a2e] py-3.5 rounded-lg font-bold text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">

              {submitting ?
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {hasRentals ? 'Creating Rental...' : 'Creating Sale...'}
                </> :

                <>
                  <FileText className="w-5 h-5" />
                  Generate Bill
                </>
              }
            </button>
            {!isDepositValid && hasRentals &&
              <p className="text-xs text-red-500 text-center mt-2 font-medium">
                Deposit must cover the total amount
              </p>
            }
            {!isCustomerValid && hasRentals &&
              <p className="text-xs text-red-500 text-center mt-2">
                Please select a registered customer for rental orders
              </p>
            }
          </div>
        </div>
      </div>
    </div>);

}