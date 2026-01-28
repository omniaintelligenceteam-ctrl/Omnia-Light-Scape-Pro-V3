import React, { useState } from 'react';
import { Calendar, Check } from 'lucide-react';

export interface DateRangeValue {
  startDate: Date;
  endDate: Date;
  label: string;
}

interface DateRangePickerAdvancedProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
}

type PresetOption = 'last7' | 'last30' | 'lastQuarter' | 'lastYear' | 'custom';

export const DateRangePickerAdvanced: React.FC<DateRangePickerAdvancedProps> = ({
  value,
  onChange
}) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>('last30');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const getPresetRange = (preset: PresetOption): DateRangeValue | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case 'last7': {
        const start = new Date(today);
        start.setDate(today.getDate() - 7);
        return {
          startDate: start,
          endDate: today,
          label: 'Last 7 Days'
        };
      }
      case 'last30': {
        const start = new Date(today);
        start.setDate(today.getDate() - 30);
        return {
          startDate: start,
          endDate: today,
          label: 'Last 30 Days'
        };
      }
      case 'lastQuarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterStartMonth = currentQuarter * 3;
        const start = new Date(now.getFullYear(), quarterStartMonth, 1);
        const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
        return {
          startDate: start,
          endDate: end > today ? today : end,
          label: 'Last Quarter'
        };
      }
      case 'lastYear': {
        const start = new Date(now.getFullYear(), 0, 1);
        return {
          startDate: start,
          endDate: today,
          label: 'This Year'
        };
      }
      case 'custom':
        return null;
      default:
        return null;
    }
  };

  const handlePresetClick = (preset: PresetOption) => {
    setSelectedPreset(preset);

    if (preset !== 'custom') {
      const range = getPresetRange(preset);
      if (range) {
        onChange(range);
      }
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);

      if (start <= end) {
        onChange({
          startDate: start,
          endDate: end,
          label: 'Custom Range'
        });
      }
    }
  };

  return (
    <div className="bg-white/[0.02] rounded-xl border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-bold text-white">Date Range</h3>
      </div>

      {/* Preset Options */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => handlePresetClick('last7')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedPreset === 'last7'
              ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>Last 7 Days</span>
            {selectedPreset === 'last7' && <Check className="w-4 h-4" />}
          </div>
        </button>

        <button
          onClick={() => handlePresetClick('last30')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedPreset === 'last30'
              ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>Last 30 Days</span>
            {selectedPreset === 'last30' && <Check className="w-4 h-4" />}
          </div>
        </button>

        <button
          onClick={() => handlePresetClick('lastQuarter')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedPreset === 'lastQuarter'
              ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>Last Quarter</span>
            {selectedPreset === 'lastQuarter' && <Check className="w-4 h-4" />}
          </div>
        </button>

        <button
          onClick={() => handlePresetClick('lastYear')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedPreset === 'lastYear'
              ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>This Year</span>
            {selectedPreset === 'lastYear' && <Check className="w-4 h-4" />}
          </div>
        </button>
      </div>

      {/* Custom Range */}
      <button
        onClick={() => handlePresetClick('custom')}
        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all mb-3 ${
          selectedPreset === 'custom'
            ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
            : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
        }`}
      >
        <div className="flex items-center justify-between">
          <span>Custom Range</span>
          {selectedPreset === 'custom' && <Check className="w-4 h-4" />}
        </div>
      </button>

      {selectedPreset === 'custom' && (
        <div className="space-y-3 p-3 bg-white/5 rounded-lg border border-white/10">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <button
            onClick={handleCustomApply}
            disabled={!customStart || !customEnd}
            className="w-full px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Custom Range
          </button>
        </div>
      )}

      {/* Current Selection Display */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-xs text-gray-400 mb-1">Current Range</div>
        <div className="text-sm font-medium text-white">
          {value.startDate.toLocaleDateString()} - {value.endDate.toLocaleDateString()}
        </div>
        <div className="text-xs text-gray-500 mt-1">{value.label}</div>
      </div>
    </div>
  );
};
