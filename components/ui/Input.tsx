import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon, Check, X, Loader2 } from 'lucide-react';

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  /** Validation function - return true for valid, string for error message */
  validate?: (value: string) => boolean | string | Promise<boolean | string>;
  /** Debounce delay for validation in ms (default: 300) */
  validateDebounce?: number;
  /** Show validation state indicator */
  showValidationState?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon: Icon,
  error,
  hint,
  validate,
  validateDebounce = 300,
  showValidationState = true,
  className = '',
  id,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  // Debounced validation
  const runValidation = useCallback(async (value: string) => {
    if (!validate) return;

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't validate empty fields unless already touched
    if (!value && validationState === 'idle') {
      return;
    }

    setValidationState('validating');

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await validate(value);
        if (result === true) {
          setValidationState('valid');
          setValidationError(null);
        } else {
          setValidationState('invalid');
          setValidationError(typeof result === 'string' ? result : null);
        }
      } catch {
        setValidationState('invalid');
        setValidationError('Validation failed');
      }
    }, validateDebounce);
  }, [validate, validateDebounce, validationState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Determine which error to show (prop error takes precedence)
  const displayError = error || (validationState === 'invalid' ? validationError : null);
  const hasError = !!error || validationState === 'invalid';

  // Validation state icon
  const ValidationIcon = () => {
    if (!showValidationState || !validate) return null;

    return (
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <AnimatePresence mode="wait">
          {validationState === 'validating' && (
            <motion.div
              key="validating"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            </motion.div>
          )}
          {validationState === 'valid' && (
            <motion.div
              key="valid"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Check className="w-4 h-4 text-emerald-500" />
            </motion.div>
          )}
          {validationState === 'invalid' && (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <X className="w-4 h-4 text-red-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

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
            ${Icon ? 'pl-12' : 'pl-4'}
            ${validate && showValidationState ? 'pr-10' : 'pr-4'}
            ${label ? 'pt-6 pb-2' : 'py-4'}
            ${hasError
              ? 'border-red-500/50 focus:border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
              : validationState === 'valid'
              ? 'border-emerald-500/50 focus:border-emerald-500/70'
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
          onChange={(e) => {
            props.onChange?.(e);
            runValidation(e.target.value);
          }}
          placeholder={label ? ' ' : props.placeholder}
          {...props}
        />

        {/* Validation State Icon */}
        <ValidationIcon />

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
      <AnimatePresence>
        {displayError && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-red-400 text-xs mt-2 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {displayError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Hint Text */}
      {hint && !displayError && (
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
          {typeof error === 'string' ? error : 'An error occurred'}
        </motion.p>
      )}

      {hint && !error && (
        <p className="text-gray-500 text-xs mt-2">{hint}</p>
      )}
    </div>
  );
};

// Common validation helpers
export const validators = {
  email: (value: string): boolean | string => {
    if (!value) return 'Email is required';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value) ? true : 'Please enter a valid email';
  },

  phone: (value: string): boolean | string => {
    if (!value) return 'Phone number is required';
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 ? true : 'Please enter a valid phone number';
  },

  required: (message = 'This field is required') => (value: string): boolean | string => {
    return value.trim() ? true : message;
  },

  minLength: (min: number, message?: string) => (value: string): boolean | string => {
    return value.length >= min ? true : message || `Must be at least ${min} characters`;
  },

  maxLength: (max: number, message?: string) => (value: string): boolean | string => {
    return value.length <= max ? true : message || `Must be no more than ${max} characters`;
  },

  currency: (value: string): boolean | string => {
    if (!value) return true; // Allow empty for optional fields
    const num = parseFloat(value.replace(/[,$]/g, ''));
    return !isNaN(num) && num >= 0 ? true : 'Please enter a valid amount';
  },

  url: (value: string): boolean | string => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  // Combine multiple validators
  combine: (...fns: Array<(value: string) => boolean | string>) =>
    (value: string): boolean | string => {
      for (const fn of fns) {
        const result = fn(value);
        if (result !== true) return result;
      }
      return true;
    },
};
