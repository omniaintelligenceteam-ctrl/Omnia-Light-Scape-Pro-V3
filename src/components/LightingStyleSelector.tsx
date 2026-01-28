import React, { useState, useCallback, useMemo } from 'react';
import {
  LIGHTING_PRESETS,
  CUSTOM_PRESET_TEMPLATE,
  getAllPresets,
  getPresetById,
  applyOverrides,
  getColorTempLabel,
  getColorTempHex,
  buildPresetPromptAdditions,
  COLOR_TEMP_RANGE,
  INTENSITY_RANGE,
  CONTRAST_OPTIONS,
  DEFAULT_PRESET_ID,
  type LightingStyleId,
  type LightingStylePreset,
  type LightingStyleOverrides,
  type AppliedLightingStyle,
  type ContrastLevel
} from '../constants/lightingPresets';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface LightingStyleSelectorProps {
  /** Currently selected style ID */
  selectedStyleId: LightingStyleId;
  /** Current overrides */
  overrides: LightingStyleOverrides;
  /** Called when user selects a different style */
  onStyleChange: (styleId: LightingStyleId) => void;
  /** Called when user adjusts override values */
  onOverridesChange: (overrides: LightingStyleOverrides) => void;
  /** Optional: Show compact version for sidebar */
  compact?: boolean;
  /** Optional: Disable all interactions */
  disabled?: boolean;
  /** Optional: Show advanced settings toggle */
  showAdvanced?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface StyleCardProps {
  preset: LightingStylePreset;
  isSelected: boolean;
  onClick: () => void;
  compact?: boolean;
  disabled?: boolean;
}

const StyleCard: React.FC<StyleCardProps> = ({ 
  preset, 
  isSelected, 
  onClick, 
  compact,
  disabled 
}) => {
  const colorHex = getColorTempHex(preset.colorTemp);
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative group w-full text-left rounded-xl transition-all duration-200
        ${compact ? 'p-3' : 'p-4'}
        ${isSelected 
          ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500 shadow-lg shadow-amber-500/20' 
          : 'bg-[#1a1a1a] border border-[#333] hover:border-[#555] hover:bg-[#222]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      aria-pressed={isSelected}
      aria-label={`Select ${preset.name} lighting style`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      
      {/* Header with icon and name */}
      <div className="flex items-center gap-3 mb-2">
        {/* Color temp preview dot */}
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{ 
            backgroundColor: `${colorHex}20`,
            boxShadow: isSelected ? `0 0 12px ${colorHex}40` : 'none'
          }}
        >
          {preset.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold truncate ${compact ? 'text-sm' : 'text-base'} ${isSelected ? 'text-amber-400' : 'text-white'}`}>
            {preset.name}
          </h3>
          <p className={`text-gray-500 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
            {preset.shortDescription}
          </p>
        </div>
      </div>
      
      {/* Description (hide in compact mode) */}
      {!compact && (
        <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 mb-3">
          {preset.description}
        </p>
      )}
      
      {/* Settings preview */}
      <div className={`flex items-center gap-2 ${compact ? 'mt-1' : 'mt-2'}`}>
        {/* Color temp indicator */}
        <div 
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs"
          style={{ backgroundColor: `${colorHex}15`, color: colorHex }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorHex }} />
          {preset.colorTemp}K
        </div>
        
        {/* Intensity bar */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-xs text-gray-400">
          <div className="w-12 h-1.5 bg-[#333] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
              style={{ width: `${preset.intensity * 100}%` }}
            />
          </div>
          {Math.round(preset.intensity * 100)}%
        </div>
        
        {/* Contrast badge */}
        <div className={`
          px-2 py-1 rounded-md text-xs
          ${preset.contrast === 'high' 
            ? 'bg-purple-500/20 text-purple-400' 
            : preset.contrast === 'low'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-gray-500/20 text-gray-400'
          }
        `}>
          {preset.contrast === 'high' ? '◐' : preset.contrast === 'low' ? '○' : '◑'}
        </div>
      </div>
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// OVERRIDE SLIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  displayValue?: string;
  previewColor?: string;
  disabled?: boolean;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayValue,
  previewColor,
  disabled
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className={`space-y-2 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-400">{label}</label>
        <span className="text-sm font-medium text-white flex items-center gap-2">
          {previewColor && (
            <span 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: previewColor }}
            />
          )}
          {displayValue}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-[#333] rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-amber-500
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:appearance-none
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-amber-500
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer
            disabled:cursor-not-allowed
          "
          style={{
            background: `linear-gradient(to right, #D4A04A 0%, #D4A04A ${percentage}%, #333 ${percentage}%, #333 100%)`
          }}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRAST SELECTOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ContrastSelectorProps {
  value: ContrastLevel;
  onChange: (value: ContrastLevel) => void;
  disabled?: boolean;
}

const ContrastSelector: React.FC<ContrastSelectorProps> = ({ value, onChange, disabled }) => {
  return (
    <div className={`space-y-2 ${disabled ? 'opacity-50' : ''}`}>
      <label className="text-sm text-gray-400">Contrast</label>
      <div className="flex gap-2">
        {CONTRAST_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`
              flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
              ${value === option.value
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                : 'bg-[#222] text-gray-400 border border-[#333] hover:border-[#444]'
              }
              ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const LightingStyleSelector: React.FC<LightingStyleSelectorProps> = ({
  selectedStyleId,
  overrides,
  onStyleChange,
  onOverridesChange,
  compact = false,
  disabled = false,
  showAdvanced = false
}) => {
  const [showOverrides, setShowOverrides] = useState(false);
  const [showAllPresets, setShowAllPresets] = useState(false);
  
  // Get current preset and computed style
  const currentPreset = getPresetById(selectedStyleId);
  const appliedStyle = useMemo(() => 
    applyOverrides(currentPreset, overrides),
    [currentPreset, overrides]
  );
  
  // Get all presets for display
  const allPresets = useMemo(() => {
    const presets = getAllPresets();
    // Add custom option at the end
    return [...presets, CUSTOM_PRESET_TEMPLATE];
  }, []);
  
  // Limit presets shown in compact mode
  const displayedPresets = useMemo(() => {
    if (showAllPresets || !compact) return allPresets;
    // Show selected + 3 others in compact mode
    const others = allPresets.filter(p => p.id !== selectedStyleId).slice(0, 3);
    const selected = allPresets.find(p => p.id === selectedStyleId);
    return selected ? [selected, ...others] : others;
  }, [allPresets, selectedStyleId, compact, showAllPresets]);
  
  // Handle override changes
  const handleColorTempChange = useCallback((value: number) => {
    onOverridesChange({ ...overrides, colorTemp: value });
  }, [overrides, onOverridesChange]);
  
  const handleIntensityChange = useCallback((value: number) => {
    onOverridesChange({ ...overrides, intensity: value });
  }, [overrides, onOverridesChange]);
  
  const handleContrastChange = useCallback((value: ContrastLevel) => {
    onOverridesChange({ ...overrides, contrast: value });
  }, [overrides, onOverridesChange]);
  
  // Reset overrides to preset defaults
  const handleResetOverrides = useCallback(() => {
    onOverridesChange({});
  }, [onOverridesChange]);
  
  // Check if any overrides are active
  const hasOverrides = Object.keys(overrides).length > 0;
  
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
          Lighting Style
        </h3>
        {hasOverrides && (
          <button
            onClick={handleResetOverrides}
            disabled={disabled}
            className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
          >
            Reset to preset
          </button>
        )}
      </div>
      
      {/* Style cards grid */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
        {displayedPresets.map((preset) => (
          <StyleCard
            key={preset.id}
            preset={preset}
            isSelected={selectedStyleId === preset.id}
            onClick={() => onStyleChange(preset.id)}
            compact={compact}
            disabled={disabled}
          />
        ))}
      </div>
      
      {/* Show more button (compact mode) */}
      {compact && !showAllPresets && allPresets.length > 4 && (
        <button
          onClick={() => setShowAllPresets(true)}
          className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Show all {allPresets.length} styles →
        </button>
      )}
      
      {/* Overrides section */}
      <div className="border-t border-[#333] pt-4">
        <button
          onClick={() => setShowOverrides(!showOverrides)}
          disabled={disabled}
          className={`
            flex items-center justify-between w-full text-left
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          `}
        >
          <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Fine-tune Settings
            {hasOverrides && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                Modified
              </span>
            )}
          </span>
          <svg 
            className={`w-4 h-4 text-gray-500 transition-transform ${showOverrides ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showOverrides && (
          <div className="mt-4 space-y-4 p-4 bg-[#151515] rounded-lg border border-[#333]">
            {/* Color Temperature */}
            <Slider
              label="Warmth"
              value={appliedStyle.finalColorTemp}
              min={COLOR_TEMP_RANGE.min}
              max={COLOR_TEMP_RANGE.max}
              step={COLOR_TEMP_RANGE.step}
              onChange={handleColorTempChange}
              displayValue={getColorTempLabel(appliedStyle.finalColorTemp)}
              previewColor={getColorTempHex(appliedStyle.finalColorTemp)}
              disabled={disabled}
            />
            
            {/* Intensity */}
            <Slider
              label="Intensity"
              value={appliedStyle.finalIntensity}
              min={INTENSITY_RANGE.min}
              max={INTENSITY_RANGE.max}
              step={INTENSITY_RANGE.step}
              onChange={handleIntensityChange}
              displayValue={`${Math.round(appliedStyle.finalIntensity * 100)}%`}
              disabled={disabled}
            />
            
            {/* Contrast */}
            <ContrastSelector
              value={appliedStyle.finalContrast}
              onChange={handleContrastChange}
              disabled={disabled}
            />
            
            {/* Preview of computed prompt additions (advanced mode) */}
            {showAdvanced && (
              <div className="mt-4 p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                <p className="text-xs text-gray-500 mb-2">Prompt additions preview:</p>
                <p className="text-xs text-gray-400 font-mono leading-relaxed">
                  {buildPresetPromptAdditions(appliedStyle).prefix}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Current style summary */}
      <div className="flex items-center gap-3 p-3 bg-[#151515] rounded-lg border border-[#333]">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: getColorTempHex(appliedStyle.finalColorTemp) + '20' }}
        >
          {currentPreset.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {currentPreset.name}
            {hasOverrides && <span className="text-amber-400 ml-1">*</span>}
          </p>
          <p className="text-xs text-gray-500">
            {appliedStyle.finalColorTemp}K • {Math.round(appliedStyle.finalIntensity * 100)}% • {appliedStyle.finalContrast} contrast
          </p>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK FOR MANAGING LIGHTING STYLE STATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseLightingStyleReturn {
  selectedStyleId: LightingStyleId;
  overrides: LightingStyleOverrides;
  appliedStyle: AppliedLightingStyle;
  setStyleId: (id: LightingStyleId) => void;
  setOverrides: (overrides: LightingStyleOverrides) => void;
  resetToPreset: () => void;
  getPromptAdditions: () => ReturnType<typeof buildPresetPromptAdditions>;
}

export function useLightingStyle(
  initialStyleId: LightingStyleId = DEFAULT_PRESET_ID
): UseLightingStyleReturn {
  const [selectedStyleId, setSelectedStyleId] = useState<LightingStyleId>(initialStyleId);
  const [overrides, setOverrides] = useState<LightingStyleOverrides>({});
  
  const currentPreset = getPresetById(selectedStyleId);
  const appliedStyle = useMemo(() => 
    applyOverrides(currentPreset, overrides),
    [currentPreset, overrides]
  );
  
  const setStyleId = useCallback((id: LightingStyleId) => {
    setSelectedStyleId(id);
    // Optionally reset overrides when changing style
    // setOverrides({});
  }, []);
  
  const resetToPreset = useCallback(() => {
    setOverrides({});
  }, []);
  
  const getPromptAdditions = useCallback(() => {
    return buildPresetPromptAdditions(appliedStyle);
  }, [appliedStyle]);
  
  return {
    selectedStyleId,
    overrides,
    appliedStyle,
    setStyleId,
    setOverrides,
    resetToPreset,
    getPromptAdditions
  };
}

export default LightingStyleSelector;
