import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Check } from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import { ToggleRow } from '../ui/SettingsToggle';
import { ChipSelect } from '../ui/SegmentedControl';
import { ColorPicker } from '../ui/ColorPicker';
import { ACCENT_COLORS } from '../../../constants';
import { AccentColor, FontSize } from '../../../types';

interface AppearanceSectionProps {
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  accentColor?: AccentColor;
  onAccentColorChange?: (color: AccentColor) => void;
  fontSize?: FontSize;
  onFontSizeChange?: (size: FontSize) => void;
  highContrast?: boolean;
  onHighContrastChange?: (enabled: boolean) => void;
  enableBeforeAfter?: boolean;
  onEnableBeforeAfterChange?: (enabled: boolean) => void;
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  accentColor = 'gold',
  onAccentColorChange,
  fontSize = 'normal',
  onFontSizeChange,
  highContrast = false,
  onHighContrastChange,
  enableBeforeAfter = true,
  onEnableBeforeAfterChange
}) => {
  return (
    <motion.div
      key="appearance"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <p className="text-sm text-gray-400 mb-6">
        Customize the look and feel of your workspace.
      </p>

      <SettingsCard className="p-6 space-y-8">
        {/* Theme - Dark Mode Only */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4 block">
            Theme
          </label>
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center shadow-lg">
              <Moon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Dark Mode</span>
              <p className="text-xs text-gray-500">Optimized for professional use</p>
            </div>
            <div className="ml-auto w-5 h-5 rounded-full bg-[#F6B45A] flex items-center justify-center">
              <Check className="w-3 h-3 text-black" />
            </div>
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4 block">
            Accent Color
          </label>
          <ColorPicker
            colors={ACCENT_COLORS}
            value={accentColor}
            onChange={(id) => onAccentColorChange?.(id as typeof accentColor)}
          />
        </div>

        {/* Font Size */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4 block">
            Text Size
          </label>
          <ChipSelect
            options={[
              { value: 'compact', label: 'Compact', sublabel: 'Smaller text' },
              { value: 'normal', label: 'Normal', sublabel: 'Default' },
              { value: 'comfortable', label: 'Large', sublabel: 'Bigger text' }
            ]}
            value={fontSize}
            onChange={(v) => onFontSizeChange?.(v as typeof fontSize)}
            columns={3}
          />
        </div>

        {/* High Contrast */}
        <ToggleRow
          title="High Contrast Mode"
          description="Increase visibility for better readability"
          checked={highContrast}
          onChange={(v) => onHighContrastChange?.(v)}
        />

        {/* Before/After Comparison */}
        <ToggleRow
          title="Before/After Comparison"
          description="Show side-by-side comparison option when viewing generated designs"
          checked={enableBeforeAfter}
          onChange={(v) => onEnableBeforeAfterChange?.(v)}
        />
      </SettingsCard>
    </motion.div>
  );
};
