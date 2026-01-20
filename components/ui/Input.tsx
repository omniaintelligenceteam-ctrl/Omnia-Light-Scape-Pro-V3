import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon: Icon,
  error,
  hint,
  className = '',
  id,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="relative">
      {/* Input Container */}
      <div className="relative">
        {/* Icon */}
        {Icon && (
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
            isFocused ? 'text-[#F6B45A]' : 'text-gray-500'
          }`}>
            <Icon className="w-5 h-5" />
          </div>
        )}

        {/* Input Field */}
        <input
          id={inputId}
          className={`
            w-full bg-[#0a0a0a] border rounded-xl text-white placeholder-gray-500
            transition-all duration-200 outline-none
            ${Icon ? 'pl-12 pr-4' : 'px-4'}
            ${label ? 'pt-6 pb-2' : 'py-4'}
            ${error
              ? 'border-red-500/50 focus:border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
              : 'border-white/10 focus:border-[#F6B45A]/50 focus:shadow-[0_0_20px_rgba(246,180,90,0.1)]'
            }
            ${className}
          `}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          placeholder={label ? ' ' : props.placeholder}
          {...props}
        />

        {/* Floating Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={`
              absolute left-4 transition-all duration-200 pointer-events-none
              ${Icon ? 'left-12' : 'left-4'}
              ${(isFocused || props.value || props.defaultValue)
                ? 'top-2 text-[10px] font-medium text-[#F6B45A]'
                : 'top-1/2 -translate-y-1/2 text-gray-500'
              }
            `}
          >
            {label}
          </label>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-xs mt-2 flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </motion.p>
      )}

      {/* Hint Text */}
      {hint && !error && (
        <p className="text-gray-500 text-xs mt-2">{hint}</p>
      )}
    </div>
  );
};

// Textarea variant
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  className = '',
  id,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="relative">
      <div className="relative">
        <textarea
          id={inputId}
          className={`
            w-full bg-[#0a0a0a] border rounded-xl px-4 text-white placeholder-gray-500
            transition-all duration-200 outline-none resize-none
            ${label ? 'pt-6 pb-2' : 'py-4'}
            ${error
              ? 'border-red-500/50 focus:border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
              : 'border-white/10 focus:border-[#F6B45A]/50 focus:shadow-[0_0_20px_rgba(246,180,90,0.1)]'
            }
            ${className}
          `}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          placeholder={label ? ' ' : props.placeholder}
          {...props}
        />

        {label && (
          <label
            htmlFor={inputId}
            className={`
              absolute left-4 transition-all duration-200 pointer-events-none
              ${(isFocused || props.value || props.defaultValue)
                ? 'top-2 text-[10px] font-medium text-[#F6B45A]'
                : 'top-4 text-gray-500'
              }
            `}
          >
            {label}
          </label>
        )}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-xs mt-2 flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </motion.p>
      )}

      {hint && !error && (
        <p className="text-gray-500 text-xs mt-2">{hint}</p>
      )}
    </div>
  );
};
