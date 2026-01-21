import React from 'react';

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
  const inputClasses = `w-full bg-transparent border-b border-white/10 py-2.5 text-white placeholder-gray-600
    focus:border-[#F6B45A] focus:outline-none transition-colors duration-200 text-sm
    ${prefix ? 'pl-6' : ''} ${suffix ? 'pr-6' : ''}`;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {prefix}
          </span>
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={`${inputClasses} resize-none`}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={inputClasses}
          />
        )}
        {suffix && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {suffix}
          </span>
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
  type?: 'text' | 'email' | 'number';
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
}) => (
  <div className="space-y-2">
    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
      {label}
    </label>
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-white text-sm
          placeholder-gray-600 focus:border-[#F6B45A]/50 focus:outline-none focus:ring-1 focus:ring-[#F6B45A]/20
          transition-all duration-200 ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-10' : ''}`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
          {suffix}
        </span>
      )}
    </div>
  </div>
);
