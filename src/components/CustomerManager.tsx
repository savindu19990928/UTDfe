import React, { useState, useRef } from 'react';
import { CustomerRecord } from '../types';
import {
  Users,
  Plus,
  Search,
  Edit,
  Camera,
  Upload,
  X,
  CheckCircle,
  Ban,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomers } from '../hooks/useCustomers';
import { API_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';
export function CustomerManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    customers,
    loading,
    error,
    totalCount,
    submitting,
    addCustomer,
    updateCustomer,
    refetch
  } = useCustomers({
    search: searchQuery
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // OTP verification state
  const [verifyingPhone, setVerifyingPhone] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const handleSendOtp = async (mobileNumber: string) => {
    setOtpSending(true);
    setOtpError(null);
    setOtpValue('');
    setOtpSent(false);
    try {
      const res = await fetch(`${API_URL}customers/resend_otp/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mobile_number: mobileNumber
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const msg = errData ?
        typeof errData === 'string' ?
        errData :
        errData.detail || errData.message || JSON.stringify(errData) :
        `Failed to send OTP (${res.status})`;
        throw new Error(msg);
      }
      setVerifyingPhone(mobileNumber);
      setOtpSent(true);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to send OTP');
      setVerifyingPhone(mobileNumber);
    } finally {
      setOtpSending(false);
    }
  };
  const handleVerifyOtp = async () => {
    if (!verifyingPhone || !otpValue.trim()) return;
    setOtpVerifying(true);
    setOtpError(null);
    try {
      const res = await fetch(`${API_URL}customers/verify_phone/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          otp: otpValue.trim(),
          mobile_number: verifyingPhone
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const msg = errData ?
        typeof errData === 'string' ?
        errData :
        errData.detail || errData.message || JSON.stringify(errData) :
        `Verification failed (${res.status})`;
        throw new Error(msg);
      }
      // Success — close modal and refresh
      setVerifyingPhone(null);
      setOtpValue('');
      setOtpError(null);
      setOtpSent(false);
      refetch();
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed');
    } finally {
      setOtpVerifying(false);
    }
  };
  const closeOtpModal = () => {
    setVerifyingPhone(null);
    setOtpValue('');
    setOtpError(null);
    setOtpSent(false);
  };
  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setAddress('');
    setNicNumber('');
    setPhotoFile(null);
    setPhotoPreview('');
    setFormError(null);
    setIsFormOpen(false);
  };
  const handleEdit = (customer: CustomerRecord) => {
    setEditingId(customer.id);
    setName(customer.name);
    setPhone(customer.phone);
    setAddress(customer.address);
    setNicNumber(customer.nicNumber || '');
    setPhotoFile(null);
    setPhotoPreview(customer.photoUrl || '');
    setFormError(null);
    setIsFormOpen(true);
  };
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !address) return;
    setFormError(null);
    try {
      if (editingId) {
        await updateCustomer(editingId, {
          name,
          mobile_number: phone,
          address,
          nic: nicNumber || undefined,
          photo: photoFile
        });
      } else {
        await addCustomer({
          name,
          mobile_number: phone,
          address,
          nic: nicNumber || undefined,
          photo: photoFile
        });
      }
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer');
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2">
            Customer Management
          </h1>
          <p className="text-gray-600">Rental customer profiles</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsFormOpen(!isFormOpen);
            }}
            className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#d4901e] text-[#1a1a2e] px-4 py-2.5 rounded-lg font-bold transition-colors shadow-sm">
            
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, phone, or NIC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#f5a623] transition-shadow" />
          
        </div>
        {!loading &&
        <span className="text-sm text-gray-500 font-medium">
            {totalCount} customer{totalCount !== 1 ? 's' : ''}
          </span>
        }
      </div>

      {/* Add/Edit Form */}
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
            
              <h3 className="text-lg font-bold text-[#1a1a2e] mb-6">
                {editingId ? 'Edit Customer' : 'New Customer Profile'}
              </h3>

              {formError &&
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
            }

              <div className="flex flex-col md:flex-row gap-8">
                {/* Photo Upload */}
                <div className="flex flex-col items-center gap-4">
                  <div
                  className="w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}>
                  
                    {photoPreview ?
                  <>
                        <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover" />
                    
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </> :

                  <div className="text-center p-4">
                        <Camera className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs text-gray-500">No Photo</span>
                      </div>
                  }
                    <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoChange}
                    accept="image/*"
                    className="hidden" />
                  
                  </div>
                  <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-bold text-[#f5a623] hover:underline flex items-center gap-1">
                  
                    <Upload className="w-4 h-4" />
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </button>
                </div>

                {/* Fields */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Full Name *
                    </label>
                    <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                    required />
                  
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Phone Number *
                    </label>
                    <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+94XXXXXXXXX"
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                    required />
                  
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Address *
                    </label>
                    <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none"
                    required />
                  
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      NIC / ID Number
                    </label>
                    <input
                    type="text"
                    value={nicNumber}
                    onChange={(e) => setNicNumber(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] outline-none" />
                  
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                
                  Cancel
                </button>
                <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-[#1a1a2e] text-white rounded-lg font-bold hover:bg-[#2d4059] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ?
                'Saving...' :
                editingId ?
                'Update Customer' :
                'Create Customer'}
                </button>
              </div>
            </form>
          </motion.div>
        }
      </AnimatePresence>

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {verifyingPhone &&
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeOtpModal}>
          
            <motion.div
            initial={{
              scale: 0.95,
              opacity: 0
            }}
            animate={{
              scale: 1,
              opacity: 1
            }}
            exit={{
              scale: 0.95,
              opacity: 0
            }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            
              <div className="p-4 bg-[#1a1a2e] text-white">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#f5a623]" />
                  <h3 className="font-bold text-lg">Verify Phone</h3>
                </div>
                <p className="text-sm text-white/70 mt-1">
                  {otpSent ?
                `OTP sent to ${verifyingPhone}` :
                `Sending OTP to ${verifyingPhone}...`}
                </p>
              </div>
              <div className="p-5 space-y-4">
                {otpError &&
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {otpError}
                  </div>
              }

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Enter OTP Code
                  </label>
                  <input
                  type="text"
                  value={otpValue}
                  onChange={(e) => {
                    setOtpValue(e.target.value);
                    setOtpError(null);
                  }}
                  placeholder="Enter OTP..."
                  maxLength={8}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-center text-xl font-mono font-bold tracking-widest focus:ring-2 focus:ring-[#f5a623] outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && otpValue.trim()) {
                      handleVerifyOtp();
                    }
                  }} />
                
                </div>

                <button
                type="button"
                onClick={() => handleSendOtp(verifyingPhone)}
                disabled={otpSending}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 flex items-center gap-1">
                
                  {otpSending ?
                <Loader2 className="w-3 h-3 animate-spin" /> :

                <RefreshCw className="w-3 h-3" />
                }
                  Resend OTP
                </button>

                <div className="flex gap-3 pt-2">
                  <button
                  onClick={closeOtpModal}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">
                  
                    Cancel
                  </button>
                  <button
                  onClick={handleVerifyOtp}
                  disabled={!otpValue.trim() || otpVerifying}
                  className="flex-1 px-4 py-2.5 bg-[#1a1a2e] text-white rounded-lg text-sm font-bold hover:bg-[#2d4059] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  
                    {otpVerifying &&
                  <Loader2 className="w-4 h-4 animate-spin" />
                  }
                    {otpVerifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Loading */}
      {loading && customers.length === 0 &&
      <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#f5a623] animate-spin" />
          <span className="ml-3 text-gray-500 font-medium">
            Loading customers...
          </span>
        </div>
      }

      {/* Error */}
      {error && !loading &&
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium mb-3">{error}</p>
          <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">
          
            Retry
          </button>
        </div>
      }

      {/* Grid */}
      {!error &&
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!loading && customers.length === 0 ?
        <div className="col-span-full text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No customers found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ?
            'Try adjusting your search terms.' :
            'No customers registered yet.'}
              </p>
            </div> :

        customers.map((customer) =>
        <motion.div
          key={customer.id}
          initial={{
            opacity: 0,
            y: 10
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col gap-4 transition-shadow ${customer.isBanned ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
          
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 relative">
                    {customer.photoUrl ?
              <img
                src={customer.photoUrl}
                alt={customer.name}
                className="w-full h-full object-cover" /> :


              <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        <Users className="w-8 h-8" />
                      </div>
              }
                    {customer.isBanned &&
              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <Ban className="w-8 h-8 text-red-600" />
                      </div>
              }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#1a1a2e] truncate">
                        {customer.name}
                      </h3>
                      {customer.isBanned &&
                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex-shrink-0">
                          BANNED
                        </span>
                }
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-sm text-gray-500">{customer.phone}</p>
                      {customer.phoneVerified ?
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> :

                <>
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex-shrink-0">
                            NOT VERIFIED
                          </span>
                          <button
                    type="button"
                    onClick={() => handleSendOtp(customer.phone)}
                    disabled={
                    otpSending && verifyingPhone === customer.phone
                    }
                    className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex-shrink-0 hover:bg-blue-200 transition-colors disabled:opacity-50">
                    
                            {otpSending && verifyingPhone === customer.phone ?
                    <Loader2 className="w-2.5 h-2.5 animate-spin inline" /> :

                    'VERIFY'
                    }
                          </button>
                        </>
                }
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-1">
                      {customer.address}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {customer.nicNumber &&
                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase">
                          NIC: {customer.nicNumber}
                        </span>
                }
                      {customer.rentalCount != null &&
                customer.rentalCount > 0 &&
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                            <Clock className="w-2.5 h-2.5" />
                            {customer.rentalCount} rentals
                          </span>
                }
                    </div>
                  </div>
                </div>

                {/* Edit button */}
                <div className="flex items-center pt-3 border-t border-gray-100">
                  <button
              onClick={() => handleEdit(customer)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">
              
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
              </motion.div>
        )
        }
        </div>
      }
    </div>);

}