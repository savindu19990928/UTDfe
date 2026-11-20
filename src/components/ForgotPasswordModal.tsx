import { useState, useEffect, FormEvent } from 'react';
import {
  X,
  KeyRound,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Info
} from 'lucide-react';
import { forgotPasswordRequest } from '../utils/auth';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialUsername?: string;
  onClose: () => void;
}

export function ForgotPasswordModal({
  isOpen,
  initialUsername = '',
  onClose
}: ForgotPasswordModalProps) {
  const [username, setUsername] = useState(initialUsername);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{
    detail: string;
    phone_number?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setUsername(initialUsername || '');
    setPhoneNumber('');
    setError('');
    setSuccessData(null);
    setIsSubmitting(false);
  }, [isOpen, initialUsername]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedUser = username.trim();
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedUser && !trimmedPhone) {
      setError('Please enter your username, registered phone number');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const res = await forgotPasswordRequest({
        username: trimmedUser || undefined,
        phone_number: trimmedPhone || undefined
      });
      setSuccessData(res);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Password reset request failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a1a2e] px-6 py-5 flex items-start justify-between border-b border-[#2d4059]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#f5a623]/20 text-[#f5a623]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="forgot-password-title"
                className="text-lg font-bold text-white"
              >
                Forgot Password
              </h2>
              <p className="text-xs text-gray-300 mt-0.5">
                Reset via SMS to your registered phone number
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {successData ? (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm text-emerald-900">
                  <p className="font-semibold">{successData.detail}</p>
                  {successData.phone_number && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs font-mono font-bold text-emerald-800">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      SMS sent to: {successData.phone_number}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Use the temporary password from the SMS to sign in, then change it
                from your profile menu.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full bg-[#1a1a2e] hover:bg-[#2d4059] text-white font-bold py-3 rounded-xl transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Enter your username, your registered phone number. Only
                  works if your account already has a registered phone number
                  (otherwise contact an Admin).
                </span>
              </div>

              {error && (
                <div
                  role="alert"
                  className="bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2 border border-red-200"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-username"
                  className="text-sm font-bold text-gray-700 block"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="forgot-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isSubmitting}
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-transparent outline-none transition-all disabled:bg-gray-100"
                    placeholder="e.g. cashier1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-phone"
                  className="text-sm font-bold text-gray-700 block"
                >
                  Registered Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="forgot-phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-transparent outline-none transition-all disabled:bg-gray-100"
                    placeholder="e.g. 0771234567"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Enter at least your username or registered phone number.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#1a1a2e] hover:bg-[#2d4059] text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending SMS…
                    </>
                  ) : (
                    'Send Temporary Password via SMS'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
