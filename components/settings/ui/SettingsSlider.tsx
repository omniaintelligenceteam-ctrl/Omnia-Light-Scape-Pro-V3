import React from 'react';

interface SettingsSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

export const SettingsSlider: React.FC<SettingsSliderProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  unit = '%'
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-sm font-mono font-semibold text-[#F6B45A]">
          {value}{unit}
        </span>
      </div>

      <div className="relative h-2 w-full">
        {/* Track background */}
        <div className="absolute inset-0 bg-white/10 rounded-full" />

        {/* Filled track */}
        <div
          className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#F6B45A] to-[#f0a847] rounded-full transition-all duration-75"
          style={{ width: `${percentage}%` }}
        />

        {/* Input (invisible but interactive) */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] pointer-events-none transition-all duration-75"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
};
