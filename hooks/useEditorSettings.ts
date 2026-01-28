import { useState, useCallback } from 'react';
import { DEFAULT_PRICING } from '../constants';
import type { FixturePricing, CustomPricingItem, FixtureCatalogItem } from '../types';

interface UseEditorSettingsReturn {
  // Lighting settings
  colorTemp: string;
  lightIntensity: number;
  darknessLevel: number;
  beamAngle: number;
  
  // Pricing
  pricing: FixturePricing[];
  customPricing: CustomPricingItem[];
  fixtureCatalog: FixtureCatalogItem[];
  
  // Setters
  setColorTemp: React.Dispatch<React.SetStateAction<string>>;
  setLightIntensity: React.Dispatch<React.SetStateAction<number>>;
  setDarknessLevel: React.Dispatch<React.SetStateAction<number>>;
  setBeamAngle: React.Dispatch<React.SetStateAction<number>>;
  setPricing: React.Dispatch<React.SetStateAction<FixturePricing[]>>;
  setCustomPricing: React.Dispatch<React.SetStateAction<CustomPricingItem[]>>;
  setFixtureCatalog: React.Dispatch<React.SetStateAction<FixtureCatalogItem[]>>;
  
  // Utility
  resetToDefaults: () => void;
}

export function useEditorSettings(): UseEditorSettingsReturn {
  // Lighting settings with sensible defaults
  const [colorTemp, setColorTemp] = useState<string>('3000k');
  const [lightIntensity, setLightIntensity] = useState<number>(45);
  const [darknessLevel, setDarknessLevel] = useState<number>(85); // 0-100, higher = darker night sky
  const [beamAngle, setBeamAngle] = useState<number>(30);
  
  // Pricing configuration
  const [pricing, setPricing] = useState<FixturePricing[]>(DEFAULT_PRICING);
  const [customPricing, setCustomPricing] = useState<CustomPricingItem[]>([]);
  const [fixtureCatalog, setFixtureCatalog] = useState<FixtureCatalogItem[]>([]);

  // Reset all settings to defaults
  const resetToDefaults = useCallback(() => {
    setColorTemp('3000k');
    setLightIntensity(45);
    setDarknessLevel(85);
    setBeamAngle(30);
    setPricing(DEFAULT_PRICING);
  }, []);

  return {
    // State
    colorTemp,
    lightIntensity,
    darknessLevel,
    beamAngle,
    pricing,
    customPricing,
    fixtureCatalog,
    
    // Setters
    setColorTemp,
    setLightIntensity,
    setDarknessLevel,
    setBeamAngle,
    setPricing,
    setCustomPricing,
    setFixtureCatalog,
    
    // Actions
    resetToDefaults,
  };
}
