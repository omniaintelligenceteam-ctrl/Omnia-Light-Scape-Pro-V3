import React from 'react';
import { motion } from 'framer-motion';

interface SettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({ checked, onChange, disabled = false }) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    } ${checked ? 'bg-emerald-500' : 'bg-white/10'}`}
  >
    <motion.div
      className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg"
      animate={{
        x: checked ? 24 : 4,
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
);

interface ToggleRowProps {
  icon?: React.ElementType;
  iconColor?: string;
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  icon: Icon,
  iconColor = 'text-gray-400',
  title,
  description,
  checked,
  onChange,
  disabled = false
}) => (
  <div className="flex items-center justify-between py-3.5 px-4 bg-white/[0.02] rounded-xl border border-white/5">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </div>
    <SettingsToggle checked={checked} onChange={onChange} disabled={disabled} />
  </div>
);
