import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ElementType;
  iconColor?: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md'
}: SegmentedControlProps<T>) {
  const sizeClasses = {
    sm: 'p-0.5 text-xs',
    md: 'p-1 text-sm',
    lg: 'p-1.5 text-base'
  };

  const buttonSizeClasses = {
    sm: 'py-1.5 px-3',
    md: 'py-2 px-4',
    lg: 'py-2.5 px-5'
  };

  return (
    <div className={`inline-flex bg-white/5 rounded-xl ${sizeClasses[size]}`}>
      {options.map((option) => {
        const isSelected = value === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`relative ${buttonSizeClasses[size]} rounded-lg font-medium transition-all duration-200 ${
              isSelected
                ? 'text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="segmented-bg"
                className="absolute inset-0 bg-[#F6B45A] rounded-lg"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {Icon && <Icon className={`w-4 h-4 ${isSelected ? '' : option.iconColor || ''}`} />}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Chip-style selection for multiple options (like color temp, beam angle)
interface ChipSelectProps<T extends string | number> {
  options: { value: T; label: string; sublabel?: string; color?: string }[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
}

export function ChipSelect<T extends string | number>({
  options,
  value,
  onChange,
  columns = 4
}: ChipSelectProps<T>) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5'
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || 'grid-cols-4'} gap-2`}>
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            className={`relative py-3 px-2 rounded-xl border text-center transition-all ${
              isSelected
                ? 'bg-[#F6B45A]/10 border-[#F6B45A] shadow-[0_0_15px_rgba(246,180,90,0.15)]'
                : 'bg-white/[0.02] border-white/5 hover:border-white/15'
            }`}
          >
            {option.color && (
              <div
                className="w-5 h-5 rounded-full mx-auto mb-1.5 border border-white/10"
                style={{ backgroundColor: option.color }}
              />
            )}
            <span className={`text-xs font-semibold block ${isSelected ? 'text-[#F6B45A]' : 'text-white'}`}>
              {option.label}
            </span>
            {option.sublabel && (
              <span className="text-[10px] text-gray-500 block mt-0.5">{option.sublabel}</span>
            )}
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 text-[#F6B45A]">
                <Check className="w-3 h-3" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
