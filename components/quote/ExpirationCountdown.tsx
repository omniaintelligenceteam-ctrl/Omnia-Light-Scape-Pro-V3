import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

interface ExpirationCountdownProps {
  expiresAt: string;
  onExpired?: () => void;
}

const calculateTimeLeft = (expiresAt: string): TimeLeft => {
  const expires = new Date(expiresAt);
  const now = new Date();
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, totalSeconds };
};

interface TimeBlockProps {
  value: number;
  label: string;
  isUrgent: boolean;
}

const TimeBlock: React.FC<TimeBlockProps> = ({ value, label, isUrgent }) => (
  <div className="flex flex-col items-center">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative min-w-[56px] md:min-w-[64px] px-3 py-2.5 md:py-3 rounded-xl border transition-all ${
        isUrgent
          ? 'bg-gradient-to-b from-amber-500/20 to-amber-500/10 border-amber-500/30'
          : 'bg-gradient-to-b from-white/[0.08] to-white/[0.04] border-white/10'
      }`}
    >
      <motion.span
        key={value}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className={`block text-xl md:text-2xl font-bold text-center font-mono ${
          isUrgent ? 'text-amber-400' : 'text-white'
        }`}
      >
        {value.toString().padStart(2, '0')}
      </motion.span>

      {/* Urgent pulse effect */}
      {isUrgent && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-amber-500/50"
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
    <span className={`mt-1.5 text-[10px] md:text-xs font-medium uppercase tracking-wider ${
      isUrgent ? 'text-amber-400/70' : 'text-gray-500'
    }`}>
      {label}
    </span>
  </div>
);

export const ExpirationCountdown: React.FC<ExpirationCountdownProps> = ({
  expiresAt,
  onExpired
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(expiresAt);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.totalSeconds <= 0) {
        clearInterval(timer);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpired]);

  // Don't show if already expired
  if (timeLeft.totalSeconds <= 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl"
      >
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <span className="text-red-400 font-semibold">This quote has expired</span>
      </motion.div>
    );
  }

  const isUrgent = timeLeft.days < 3;
  const showDays = timeLeft.days > 0;
  const showHours = timeLeft.days < 7; // Only show hours if less than a week

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      {/* Header */}
      <div className={`flex items-center justify-center gap-2 mb-4 ${
        isUrgent ? 'text-amber-400' : 'text-gray-400'
      }`}>
        {isUrgent ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Clock className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {isUrgent ? 'Offer expires soon!' : 'Quote valid for'}
        </span>
      </div>

      {/* Countdown Blocks */}
      <div className="flex items-center justify-center gap-2 md:gap-3">
        {showDays && (
          <>
            <TimeBlock value={timeLeft.days} label="Days" isUrgent={isUrgent} />
            <span className={`text-xl font-bold ${isUrgent ? 'text-amber-400/50' : 'text-white/30'}`}>:</span>
          </>
        )}
        {showHours && (
          <>
            <TimeBlock value={timeLeft.hours} label="Hours" isUrgent={isUrgent} />
            <span className={`text-xl font-bold ${isUrgent ? 'text-amber-400/50' : 'text-white/30'}`}>:</span>
          </>
        )}
        <TimeBlock value={timeLeft.minutes} label="Min" isUrgent={isUrgent} />
        {!showDays && (
          <>
            <span className={`text-xl font-bold ${isUrgent ? 'text-amber-400/50' : 'text-white/30'}`}>:</span>
            <TimeBlock value={timeLeft.seconds} label="Sec" isUrgent={isUrgent} />
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ExpirationCountdown;
