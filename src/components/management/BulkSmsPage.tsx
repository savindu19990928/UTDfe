import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Send,
  ShieldOff,
  Smartphone,
  X } from
'lucide-react';
import { useBulkSms } from '../../hooks/useBulkSms';
import { countSms } from '../../utils/sms';

const MAX_LENGTH = 1000;

export function BulkSmsPage() {
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { sending, error, result, sendBulkSms, reset } = useBulkSms();

  const count = useMemo(() => countSms(message), [message]);
  const trimmed = message.trim();
  const canSend = trimmed.length > 0 && !sending;

  const handleSend = async () => {
    const ok = await sendBulkSms(trimmed);
    if (ok) {
      setConfirmOpen(false);
      setMessage('');
    }
  };

  const openConfirm = () => {
    reset();
    setConfirmOpen(true);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1a1a2e] flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#f5a623]" />
          Bulk SMS
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Write one message and send it to every active customer with a
          registered mobile number.
        </p>
      </div>

      {result &&
      <div
        role="status"
        className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2 text-sm text-green-800">
        
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="font-medium">{result}</span>
        </div>
      }

      {error && !confirmOpen &&
      <div
        role="alert"
        className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
        
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      }

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        {/* Composer — the primary surface */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 pt-5">
            <label
              htmlFor="bulk-sms-message"
              className="block text-sm font-bold text-[#1a1a2e]">
              
              Message
            </label>
            <textarea
              id="bulk-sms-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
              rows={9}
              placeholder="Special discount this weekend at Tool Depot!"
              className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-[15px] leading-relaxed text-[#1a1a2e] placeholder:text-gray-400 focus:border-[#f5a623] focus:outline-none focus:ring-2 focus:ring-[#f5a623]/25" />
            
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
              <span className="font-medium text-gray-600">
                {count.characters} characters
              </span>
              <span className="text-gray-300">·</span>
              <span>
                {count.segments} SMS {count.segments === 1 ? 'part' : 'parts'}
              </span>
              {count.encoding === 'Unicode' &&
              <>
                  <span className="text-gray-300">·</span>
                  <span className="text-amber-700 font-medium">
                    Special characters shorten each part to 67
                  </span>
                </>
              }
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
            <p className="text-xs text-gray-500 max-w-sm">
              Messages are delivered immediately and cannot be recalled.
            </p>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setMessage('');
                  reset();
                }}
                disabled={!message || sending}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent">
                
                Clear
              </button>
              <button
                type="button"
                onClick={openConfirm}
                disabled={!canSend}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-[#2d4059] hover:bg-[#1a1a2e] transition-colors disabled:opacity-50 disabled:hover:bg-[#2d4059]">
                
                <Send className="w-4 h-4" />
                Review &amp; Send
              </button>
            </div>
          </div>
        </div>

        {/* Supporting rail: what the customer sees, and who gets it */}
        <div className="space-y-4">
          <div className="rounded-xl bg-[#1a1a2e] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Customer sees
            </p>
            <div className="mt-3 rounded-2xl rounded-tl-sm bg-white px-4 py-3">
              <p
                className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                trimmed ? 'text-[#1a1a2e]' : 'text-gray-400 italic'}`
                }>
                
                {trimmed || 'Your message will appear here.'}
              </p>
            </div>
            <p className="mt-2 text-[10px] text-white/40">Tool Depot · now</p>
          </div>

          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-[#1a1a2e]">Recipients</h3>
            <ul className="mt-3 space-y-2.5 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <Smartphone className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
                Every customer with a registered mobile number.
              </li>
              <li className="flex items-start gap-2">
                <ShieldOff className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
                Banned customers are automatically excluded.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {confirmOpen &&
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !sending && setConfirmOpen(false)}>
          
            <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-sms-confirm-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
            
              <div className="flex items-start justify-between gap-4 bg-[#1a1a2e] px-5 py-4">
                <h3
                id="bulk-sms-confirm-title"
                className="text-base font-bold text-white">
                
                  Send to all customers?
                </h3>
                <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={sending}
                aria-label="Close"
                className="text-white/50 hover:text-white transition-colors disabled:opacity-40">
                
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-4">
                <p className="text-sm text-gray-600">
                  This message goes out immediately to every customer who is not
                  banned and has a registered mobile number. It cannot be
                  recalled.
                </p>

                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 max-h-40 overflow-y-auto">
                  <p className="text-[13px] leading-relaxed text-[#1a1a2e] whitespace-pre-wrap break-words">
                    {trimmed}
                  </p>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {count.characters} characters · {count.segments} SMS{' '}
                  {count.segments === 1 ? 'part' : 'parts'} per customer
                </p>

                {error &&
              <div
                role="alert"
                className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
                
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    {error}
                  </div>
              }
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
                <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={sending}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40">
                
                  Cancel
                </button>
                <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-[#2d4059] hover:bg-[#1a1a2e] transition-colors disabled:opacity-60">
                
                  {sending ?
                <Loader2 className="w-4 h-4 animate-spin" /> :

                <Send className="w-4 h-4" />
                }
                  {sending ? 'Sending...' : 'Send now'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}