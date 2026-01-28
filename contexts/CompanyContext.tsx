import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { DEFAULT_PRICING } from '../constants';
import type { CompanyProfile, FixturePricing, CustomPricingItem, FixtureCatalogItem } from '../types';

interface CompanyContextType {
  // Company profile
  companyProfile: CompanyProfile;
  setCompanyProfile: (profile: CompanyProfile) => void;
  updateCompanyField: <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => void;
  
  // Pricing
  pricing: FixturePricing[];
  setPricing: (pricing: FixturePricing[]) => void;
  updatePricing: (id: string, updates: Partial<FixturePricing>) => void;
  
  // Custom pricing
  customPricing: CustomPricingItem[];
  setCustomPricing: (items: CustomPricingItem[]) => void;
  addCustomPricing: (item: Omit<CustomPricingItem, 'id'>) => void;
  removeCustomPricing: (id: string) => void;
  updateCustomPricing: (id: string, updates: Partial<CustomPricingItem>) => void;
  
  // Fixture catalog
  fixtureCatalog: FixtureCatalogItem[];
  setFixtureCatalog: (items: FixtureCatalogItem[]) => void;
  addCatalogItem: (item: Omit<FixtureCatalogItem, 'id'>) => void;
  removeCatalogItem: (id: string) => void;
  updateCatalogItem: (id: string, updates: Partial<FixtureCatalogItem>) => void;
  
  // Utility
  resetPricingToDefaults: () => void;
  isLoaded: boolean;
}

const defaultCompanyProfile: CompanyProfile = {
  name: '',
  email: '',
  phone: '',
  address: '',
  logo: null,
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Company profile
  const [companyProfile, setCompanyProfileState] = useState<CompanyProfile>(defaultCompanyProfile);
  
  // Pricing
  const [pricing, setPricingState] = useState<FixturePricing[]>(DEFAULT_PRICING);
  const [customPricing, setCustomPricingState] = useState<CustomPricingItem[]>([]);
  
  // Fixture catalog
  const [fixtureCatalog, setFixtureCatalogState] = useState<FixtureCatalogItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const savedSettings = localStorage.getItem('omnia_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.companyProfile) setCompanyProfileState(settings.companyProfile);
        if (settings.pricing) setPricingState(settings.pricing);
        if (settings.customPricing) setCustomPricingState(settings.customPricing);
        if (settings.fixtureCatalog) setFixtureCatalogState(settings.fixtureCatalog);
      }
    } catch (e) {
      console.error('Failed to load company settings from localStorage', e);
    }
    
    setIsLoaded(true);
  }, []);

  // Persist to localStorage when settings change
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoaded) return;
    
    localStorage.setItem('omnia_settings', JSON.stringify({
      companyProfile,
      pricing,
      customPricing,
      fixtureCatalog,
    }));
  }, [companyProfile, pricing, customPricing, fixtureCatalog, isLoaded]);

  // Company profile methods
  const setCompanyProfile = useCallback((profile: CompanyProfile) => {
    setCompanyProfileState(profile);
  }, []);

  const updateCompanyField = useCallback(<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    setCompanyProfileState(prev => ({ ...prev, [key]: value }));
  }, []);

  // Pricing methods
  const setPricing = useCallback((newPricing: FixturePricing[]) => {
    setPricingState(newPricing);
  }, []);

  const updatePricing = useCallback((id: string, updates: Partial<FixturePricing>) => {
    setPricingState(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  // Custom pricing methods
  const setCustomPricing = useCallback((items: CustomPricingItem[]) => {
    setCustomPricingState(items);
  }, []);

  const addCustomPricing = useCallback((item: Omit<CustomPricingItem, 'id'>) => {
    const newItem: CustomPricingItem = {
      ...item,
      id: `custom_${Date.now()}`,
    };
    setCustomPricingState(prev => [...prev, newItem]);
  }, []);

  const removeCustomPricing = useCallback((id: string) => {
    setCustomPricingState(prev => prev.filter(p => p.id !== id));
  }, []);

  const updateCustomPricing = useCallback((id: string, updates: Partial<CustomPricingItem>) => {
    setCustomPricingState(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  // Fixture catalog methods
  const setFixtureCatalog = useCallback((items: FixtureCatalogItem[]) => {
    setFixtureCatalogState(items);
  }, []);

  const addCatalogItem = useCallback((item: Omit<FixtureCatalogItem, 'id'>) => {
    const newItem: FixtureCatalogItem = {
      ...item,
      id: `catalog_${Date.now()}`,
    };
    setFixtureCatalogState(prev => [...prev, newItem]);
  }, []);

  const removeCatalogItem = useCallback((id: string) => {
    setFixtureCatalogState(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateCatalogItem = useCallback((id: string, updates: Partial<FixtureCatalogItem>) => {
    setFixtureCatalogState(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  // Reset pricing to defaults
  const resetPricingToDefaults = useCallback(() => {
    setPricingState(DEFAULT_PRICING);
    setCustomPricingState([]);
  }, []);

  const value: CompanyContextType = {
    // Company profile
    companyProfile,
    setCompanyProfile,
    updateCompanyField,
    
    // Pricing
    pricing,
    setPricing,
    updatePricing,
    
    // Custom pricing
    customPricing,
    setCustomPricing,
    addCustomPricing,
    removeCustomPricing,
    updateCustomPricing,
    
    // Fixture catalog
    fixtureCatalog,
    setFixtureCatalog,
    addCatalogItem,
    removeCatalogItem,
    updateCatalogItem,
    
    // Utility
    resetPricingToDefaults,
    isLoaded,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextType {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

// Export for convenience
export type { CompanyContextType };
