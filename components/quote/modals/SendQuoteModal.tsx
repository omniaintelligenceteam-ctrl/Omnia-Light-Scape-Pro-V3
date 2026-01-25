import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, User, Mail, Phone, Loader2, Check } from 'lucide-react';

interface SendQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  customMessage: string;
  onCustomMessageChange: (value: string) => void;
  total: number;
  lineItemsCount: number;
  onSendEmail: () => void;
  isSendingEmail: boolean;
  emailSent: boolean;
  emailError: string | null;
}

export const SendQuoteModal: React.FC<SendQuoteModalProps> = ({
  isOpen,
  onClose,
  clientName,
  clientEmail,
  clientPhone,
  customMessage,
  onCustomMessageChange,
  total,
  lineItemsCount,
  onSendEmail,
  isSendingEmail,
  emailSent,
  emailError
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-8 pb-32 bg-black/80 backdrop-blur-sm overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ paddingBottom: 'max(8rem, env(safe-area-inset-bottom, 2rem))' }}
        >
          <motion.div
            className="w-full max-w-md bg-gradient-to-b from-[#151515] to-[#0a0a0a] rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden my-auto md:my-0"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            {/* Modal Header */}
            <div className="relative flex items-center justify-between p-5 border-b border-white/10">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F6B45A]/30 to-transparent" />
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#F6B45A]/10 rounded-xl border border-[#F6B45A]/20">
                  <Send className="w-5 h-5 text-[#F6B45A]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white font-serif">Send Quote</h3>
                  <p className="text-[10px] text-gray-500">Choose delivery method</p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* Recipient Info */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <User className="w-4 h-4 text-[#F6B45A]" />
                  <span className="font-bold text-white">{clientName || 'No name set'}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3 text-gray-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{clientEmail || 'No email set'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{clientPhone || 'No phone set'}</span>
                  </div>
                </div>
              </div>

              {/* Send Method - Email Only */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="w-4 h-4 text-[#F6B45A]" />
                <span>Quote will be sent via email</span>
              </div>

              {/* Custom Message */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Add a personal message (optional)</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => onCustomMessageChange(e.target.value)}
                  placeholder="Thanks for choosing us! Let me know if you have any questions..."
                  className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-[#F6B45A]/50 focus:outline-none resize-none placeholder-gray-500 transition-colors"
                />
              </div>

              {/* Quote Preview */}
              <div className="bg-gradient-to-br from-[#F6B45A]/10 to-transparent rounded-xl p-4 border border-[#F6B45A]/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Quote Total</span>
                  <span className="text-xl font-bold text-[#F6B45A] font-mono">${total.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {lineItemsCount} items
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-white/10 bg-black/30">
              <motion.button
                onClick={onSendEmail}
                disabled={!clientEmail || isSendingEmail || emailSent}
                className={`relative w-full overflow-hidden py-4 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-lg ${
                  emailSent
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-[#F6B45A] to-[#ffc67a] text-black shadow-[#F6B45A]/20 disabled:opacity-50'
                }`}
                whileHover={!(!clientEmail || isSendingEmail || emailSent) ? { scale: 1.01 } : {}}
                whileTap={!(!clientEmail || isSendingEmail || emailSent) ? { scale: 0.99 } : {}}
              >
                {emailSent ? (
                  <>
                    <Check className="w-4 h-4" />
                    Email Sent!
                  </>
                ) : isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Quote
                  </>
                )}
                {!emailSent && !isSendingEmail && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '200%' }}
                    transition={{ duration: 0.6 }}
                  />
                )}
              </motion.button>
              {!clientEmail && (
                <p className="text-xs text-red-400 text-center mt-3">Please add a client email address first</p>
              )}
              {emailError && (
                <p className="text-xs text-red-400 text-center mt-3">{emailError}</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
