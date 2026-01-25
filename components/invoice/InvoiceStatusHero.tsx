import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, AlertTriangle, AlertCircle, Calendar, Copy, Check } from 'lucide-react';

type InvoiceStatus = 'pending' | 'due_soon' | 'overdue' | 'paid';

interface InvoiceStatusHeroProps {
  status: InvoiceStatus;
  amount: number;
  dueDate?: string | null;
  paidDate?: string | null;
  invoiceNumber: string;
  onCopy?: () => void;
}

// Calculate days until due or overdue
const getDaysUntilDue = (dueDate: string): number => {
  const due = new Date(dueDate);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Determine status based on due date
export const getInvoiceStatus = (dueDate: string | null, paid: boolean): InvoiceStatus => {
  if (paid) return 'paid';
  if (!dueDate) return 'pending';

  const days = getDaysUntilDue(dueDate);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'due_soon';
  return 'pending';
};

// Status configurations
const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Payment Due',
    sublabel: 'Invoice awaiting payment',
    bgGradient: 'from-blue-500/20 via-blue-500/10 to-blue-500/5',
    iconBg: 'bg-blue-500/20 border-blue-500/30',
    iconColor: 'text-blue-400',
    textColor: 'text-blue-400',
    pulseClass: 'animate-pulse-blue',
    glowClass: 'glow-blue'
  },
  due_soon: {
    icon: AlertTriangle,
    label: 'Due Soon',
    sublabel: 'Payment due within 7 days',
    bgGradient: 'from-amber-500/20 via-amber-500/10 to-amber-500/5',
    iconBg: 'bg-amber-500/20 border-amber-500/30',
    iconColor: 'text-amber-400',
    textColor: 'text-amber-400',
    pulseClass: 'animate-pulse-amber',
    glowClass: 'glow-amber'
  },
  overdue: {
    icon: AlertCircle,
    label: 'Overdue',
    sublabel: 'Payment past due date',
    bgGradient: 'from-red-500/20 via-red-500/10 to-red-500/5',
    iconBg: 'bg-red-500/20 border-red-500/30',
    iconColor: 'text-red-400',
    textColor: 'text-red-400',
    pulseClass: 'animate-pulse-red',
    glowClass: 'glow-red'
  },
  paid: {
    icon: CheckCircle2,
    label: 'Paid',
    sublabel: 'Payment received',
    bgGradient: 'from-emerald-500/20 via-emerald-500/10 to-emerald-500/5',
    iconBg: 'bg-emerald-500/20 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    textColor: 'text-emerald-400',
    pulseClass: 'animate-pulse-emerald',
    glowClass: 'glow-emerald'
  }
};

export const InvoiceStatusHero: React.FC<InvoiceStatusHeroProps> = ({
  status,
  amount,
  dueDate,
  paidDate,
  invoiceNumber,
  onCopy
}) => {
  const [copied, setCopied] = useState(false);
  const [displayAmount, setDisplayAmount] = useState(0);
  const config = statusConfig[status];
  const Icon = config.icon;

  // Animate amount counting up
  useEffect(() => {
    const duration = 1000;
    const steps = 40;
    const increment = amount / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= amount) {
        setDisplayAmount(amount);
        clearInterval(interval);
      } else {
        setDisplayAmount(current);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [amount]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invoiceNumber);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Calculate countdown text
  const getCountdownText = () => {
    if (status === 'paid') {
      return paidDate ? `Paid on ${formatDate(paidDate)}` : 'Payment received';
    }
    if (!dueDate) return null;

    const days = getDaysUntilDue(dueDate);
    if (days < 0) {
      return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
    }
    if (days === 0) {
      return 'Due today';
    }
    if (days === 1) {
      return 'Due tomorrow';
    }
    return `Due in ${days} days`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-br ${config.bgGradient}`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, currentColor 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
      </div>

      {/* Content */}
      <div className="relative p-6 md:p-10">
        <div className="flex flex-col items-center text-center">
          {/* Status Badge with Pulse */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className={`relative mb-6`}
          >
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl ${config.iconBg} border flex items-center justify-center ${config.pulseClass}`}>
              <Icon className={`w-8 h-8 md:w-10 md:h-10 ${config.iconColor}`} />
            </div>
            {/* Pulse ring for non-paid statuses */}
            {status !== 'paid' && (
              <div className={`absolute inset-0 rounded-2xl ${config.pulseClass}`} />
            )}
          </motion.div>

          {/* Status Label */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.iconBg} border ${config.textColor} text-sm font-semibold uppercase tracking-wider`}>
              {config.label}
            </span>
          </motion.div>

          {/* Amount */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="mb-4"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              {status === 'paid' ? 'Amount Paid' : 'Amount Due'}
            </p>
            <p className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white text-mono-price tracking-tight ${config.glowClass}`}>
              {formatCurrency(displayAmount)}
            </p>
          </motion.div>

          {/* Countdown / Due Date */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            {getCountdownText() && (
              <div className={`flex items-center gap-2 ${config.textColor}`}>
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">{getCountdownText()}</span>
              </div>
            )}
            {dueDate && status !== 'paid' && (
              <p className="text-xs text-gray-500 mt-1">
                Due by {formatDate(dueDate)}
              </p>
            )}
          </motion.div>

          {/* Invoice Number */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Invoice</p>
              <p className="text-white font-mono font-semibold tracking-wide">
                #{invoiceNumber}
              </p>
            </div>
            <motion.button
              onClick={handleCopy}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-xl border transition-all ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {copied ? (
                <Check className="w-5 h-5" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient Line */}
      <div className={`h-1 w-full bg-gradient-to-r from-transparent via-current to-transparent ${config.textColor} opacity-30`} />
    </motion.div>
  );
};

export default InvoiceStatusHero;
