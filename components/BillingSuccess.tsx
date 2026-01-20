import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

interface BillingSuccessProps {
  onContinue: () => void;
}

export const BillingSuccess: React.FC<BillingSuccessProps> = ({ onContinue }) => {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Hide confetti animation after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8">
      {/* Confetti-like animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <Sparkles className="w-4 h-4 text-[#F6B45A]" />
            </div>
          ))}
        </div>
      )}

      <div className="max-w-md w-full text-center space-y-8 p-12 bg-[#111] rounded-[28px] shadow-2xl border border-white/10 relative">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Payment Successful!</h1>
          <p className="text-gray-400">
            Welcome to Omnia Light Scape Pro
          </p>
        </div>

        {/* Features unlocked */}
        <div className="bg-black/40 p-6 rounded-2xl border border-white/5 text-left space-y-3">
          <p className="text-sm text-gray-300 font-medium mb-4">Your subscription is now active:</p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              Unlimited high-quality generations
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              No watermarks on exports
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              Priority support
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              Access to all premium features
            </li>
          </ul>
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="w-full bg-[#F6B45A] text-[#050505] rounded-xl py-4 font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#ffc67a] shadow-[0_0_20px_rgba(246,180,90,0.2)] hover:shadow-[0_0_30px_rgba(246,180,90,0.4)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
        >
          Start Creating
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Session ID info (for debugging/support) */}
        <p className="text-xs text-gray-600">
          A confirmation email has been sent to your registered email address.
        </p>
      </div>

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
