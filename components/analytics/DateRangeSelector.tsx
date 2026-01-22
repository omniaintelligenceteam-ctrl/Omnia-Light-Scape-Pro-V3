import React from 'react';
import { Calendar } from 'lucide-react';

type DateRange = 'today' | 'this_week' | 'this_month' | 'this_year';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ value, onChange }) => {
  const options: { value: DateRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'Week' },
    { value: 'this_month', label: 'Month' },
    { value: 'this_year', label: 'Year' }
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
      <Calendar className="w-4 h-4 text-gray-500 ml-2" />
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            value === option.value
              ? 'bg-[#F6B45A] text-black'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
