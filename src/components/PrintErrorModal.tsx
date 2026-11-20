import { AlertTriangle, Printer, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrintErrorModalProps {
  error: string | null;
  onClose: () => void;
  onRetry?: () => void;
}

export function PrintErrorModal({
  error,
  onClose,
  onRetry
}: PrintErrorModalProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print"
          onClick={onClose}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1a1a2e]">
                    Print Error
                  </h3>
                  <p className="text-xs text-red-600 font-medium">
                    Failed to print rental bill
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-red-100/50 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Printer className="w-7 h-7 text-red-600" />
              </div>
              <p className="text-sm text-gray-700 font-medium mb-1">
                Unable to print the bill automatically.
              </p>
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mt-2 break-words">
                {error}
              </p>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors">
                Close
              </button>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 px-4 py-2.5 bg-[#1a1a2e] text-white rounded-lg text-sm font-bold hover:bg-[#2d4059] transition-colors flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
