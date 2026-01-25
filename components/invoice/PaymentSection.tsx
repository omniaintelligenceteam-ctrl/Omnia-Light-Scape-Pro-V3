import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Lock, Shield, Phone, Mail, Loader2 } from 'lucide-react';

interface PaymentSectionProps {
  amount: number;
  onPay: () => void;
  isPaying: boolean;
  isPaid: boolean;
  companyEmail?: string;
  companyPhone?: string | null;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  amount,
  onPay,
  isPaying,
  isPaid,
  companyEmail,
  companyPhone
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  if (isPaid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500/10 to-transparent rounded-2xl p-6 md:p-8 border border-emerald-500/20"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-emerald-400 font-serif">Payment Received</h3>
            <p className="text-sm text-emerald-300/70">Thank you for your payment</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          A receipt has been sent to your email address. If you have any questions about your payment, please don't hesitate to contact us.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Pay Now Button */}
      <div className="space-y-4">
        <motion.button
          onClick={onPay}
          disabled={isPaying}
          whileHover={{ scale: isPaying ? 1 : 1.02 }}
          whileTap={{ scale: isPaying ? 1 : 0.98 }}
          className={`w-full relative overflow-hidden rounded-2xl py-5 px-6 font-bold text-lg transition-all ${
            isPaying
              ? 'bg-blue-500/50 cursor-wait'
              : 'btn-shimmer-blue hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]'
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-3 text-white">
            {isPaying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pay {formatCurrency(amount)}
              </>
            )}
          </span>

          {/* Shimmer overlay */}
          {!isPaying && (
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />
          )}
        </motion.button>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure Payment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>256-bit SSL</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-xs text-gray-500">Accepted:</span>
          <div className="flex items-center gap-2">
            {/* Visa */}
            <div className="w-10 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="text-[10px] font-bold text-blue-400">VISA</span>
            </div>
            {/* Mastercard */}
            <div className="w-10 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center">
              <div className="flex">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 -mr-1" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
            </div>
            {/* Amex */}
            <div className="w-10 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="text-[8px] font-bold text-blue-400">AMEX</span>
            </div>
          </div>
        </div>
      </div>

      {/* Powered by Stripe */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <span>Payments powered by</span>
        <div className="flex items-center gap-1 text-gray-400">
          <svg className="w-10 h-4" viewBox="0 0 60 25" fill="currentColor">
            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-3.67-3.14c0-1.25-.64-2.74-2.02-2.74-1.44 0-2.19 1.47-2.3 2.74h4.32zM36.95 19.52V1.25l4.08-.69v4.85c.72-.57 1.75-.93 2.86-.93 3.08 0 4.96 2.98 4.96 6.66 0 4.85-2.76 7.44-5.65 7.44-1.02 0-1.88-.34-2.63-.93l-.09.68h-3.53zm6.95-7.22c0-2.16-.61-3.71-2.18-3.71-.72 0-1.39.35-1.74.81v5.9c.35.4.91.64 1.49.64 1.65 0 2.43-1.48 2.43-3.64zM28.24 5.48h4.08v14.04h-4.08V5.48zm0-4.79h4.08v3.23h-4.08V.69zM20.28 19.52V8.33c0-1.06-.07-2.06-.14-2.85h3.59l.23 1.65c.73-1.17 1.95-1.9 3.63-1.9.38 0 .72.05.99.14v3.89c-.27-.09-.66-.14-1.08-.14-1.27 0-2.34.62-2.87 1.65-.14.35-.21.76-.21 1.21v7.54h-4.14zM11.79 8.45h-2.71V5.48h2.71V3.51c0-1.87.46-3.27 1.37-4.15C14.06-.48 15.37 0 17.01 0c1.02 0 2 .14 2.74.35l-.35 3.23c-.35-.14-.85-.23-1.38-.23-1.05 0-1.71.57-1.71 1.93v.2h3.02v2.97h-3.02v11.07h-4.08V8.45h-.44zm-7.19.18c-.91-.5-2.13-.92-3.62-.92-1.11 0-1.7.35-1.7 1.02 0 .57.62.88 1.74 1.42 2.2 1.04 3.63 2.34 3.63 4.44 0 3.2-2.58 4.63-5.64 4.63-1.74 0-3.47-.44-4.54-1.02l.88-3.18c1.1.57 2.49 1.02 3.66 1.02 1.23 0 1.95-.35 1.95-1.08 0-.64-.59-.99-1.79-1.55C1.2 12.37 0 11.04 0 9.09c0-2.87 2.24-4.6 5.46-4.6 1.65 0 3.16.38 4.19.88l-.88 3.23-.17.03z" />
          </svg>
        </div>
      </div>

      {/* Divider */}
      <div className="section-divider-blue" />

      {/* Alternative Payment */}
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-3">Prefer to pay by check or bank transfer?</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {companyEmail && (
            <a
              href={`mailto:${companyEmail}?subject=Invoice Payment Inquiry`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm"
            >
              <Mail className="w-4 h-4" />
              {companyEmail}
            </a>
          )}
          {companyPhone && (
            <a
              href={`tel:${companyPhone}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm"
            >
              <Phone className="w-4 h-4" />
              {companyPhone}
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PaymentSection;
