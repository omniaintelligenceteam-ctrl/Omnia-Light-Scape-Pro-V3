import React from 'react';
import { XCircle, ArrowRight, HelpCircle } from 'lucide-react';

interface BillingCanceledProps {
  onContinue: () => void;
  onRetry: () => void;
}

export const BillingCanceled: React.FC<BillingCanceledProps> = ({ onContinue, onRetry }) => {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8 p-12 bg-[#111] rounded-[28px] shadow-2xl border border-white/10">
        {/* Canceled Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gray-500/20 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-gray-400" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Payment Canceled</h1>
          <p className="text-gray-400">
            No worries! Your payment was not processed.
          </p>
        </div>

        {/* Info box */}
        <div className="bg-black/40 p-6 rounded-2xl border border-white/5 text-left space-y-3">
          <p className="text-sm text-gray-300">
            You can still use Omnia Light Scape Pro with our free tier:
          </p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#F6B45A] rounded-full" />
              25 free generations to try the app
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#F6B45A] rounded-full" />
              All basic features included
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#F6B45A] rounded-full" />
              Upgrade anytime when ready
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full bg-[#F6B45A] text-[#050505] rounded-xl py-4 font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#ffc67a] shadow-[0_0_20px_rgba(246,180,90,0.2)] hover:shadow-[0_0_30px_rgba(246,180,90,0.4)] hover:scale-[1.01] transition-all"
          >
            Try Again
          </button>

          <button
            onClick={onContinue}
            className="w-full bg-transparent text-gray-400 rounded-xl py-4 font-bold text-xs uppercase tracking-[0.2em] hover:text-white border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
          >
            Continue with Free Tier
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Help link */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <HelpCircle className="w-3 h-3" />
          <span>Having issues? Contact support@omnia.com</span>
        </div>
      </div>
    </div>
  );
};
