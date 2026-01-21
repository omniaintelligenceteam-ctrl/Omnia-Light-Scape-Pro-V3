import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface PremiumInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'number';
  prefix?: string;
  suffix?: string;
  multiline?: boolean;
  rows?: number;
}

export const PremiumInput: React.FC<PremiumInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  prefix,
  suffix,
  multiline = false,
  rows = 3
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const inputClasses = `w-full bg-transparent border-b border-white/10 py-2.5 text-white placeholder-gray-600
    focus:border-transparent focus:outline-none transition-colors duration-200 text-sm
    ${prefix ? 'pl-6' : ''} ${suffix ? 'pr-6' : ''}`;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative group">
        {prefix && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {prefix}
          </span>
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            rows={rows}
            className={`${inputClasses} resize-none`}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={inputClasses}
          />
        )}
        {suffix && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {suffix}
          </span>
        )}
        {/* Animated underline that draws in from left */}
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#F6B45A] to-[#ffc67a]"
          initial={{ width: 0 }}
          animate={{ width: isFocused ? '100%' : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        {/* Subtle glow when focused */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-4 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(246,180,90,0.1), transparent)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isFocused ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
        {/* Filled/valid indicator */}
        {value && !isFocused && (
          <motion.div
            className="absolute right-0 top-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Check className="w-3.5 h-3.5 text-emerald-500/60" />
          </motion.div>
        )}
      </div>
    </div>
  );
};

interface CardInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'number' | 'tel';
  prefix?: string;
  suffix?: string;
}

export const CardInput: React.FC<CardInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  prefix,
  suffix
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== '' && value !== undefined && value !== null;

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative group">
        {prefix && (
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium transition-colors duration-200 ${isFocused ? 'text-[#F6B45A]' : 'text-gray-500'}`}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-white text-sm
            placeholder-gray-600 focus:border-[#F6B45A]/50 focus:outline-none
            transition-all duration-200 ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
            {suffix}
          </span>
        )}
        {/* Animated cascading glow effect */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: isFocused ? 1 : 0,
            boxShadow: isFocused
              ? [
                  '0 0 0 1px rgba(246,180,90,0.2), 0 0 10px rgba(246,180,90,0.05)',
                  '0 0 0 2px rgba(246,180,90,0.3), 0 0 25px rgba(246,180,90,0.15)',
                  '0 0 0 1px rgba(246,180,90,0.25), 0 0 20px rgba(246,180,90,0.1)'
                ]
              : '0 0 0 0 transparent'
          }}
          transition={{
            opacity: { duration: 0.2 },
            boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        {/* Filled/valid indicator */}
        {hasValue && !isFocused && !suffix && (
          <motion.div
            className="absolute right-3 top-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Check className="w-3.5 h-3.5 text-emerald-500/60" />
          </motion.div>
        )}
      </div>
    </div>
  );
};
