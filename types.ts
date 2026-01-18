
export interface ColorTemperature {
  id: string;
  kelvin: string;
  color: string;
  description: string;
  prompt?: string;
}

export interface FixturePricing {
  id: string;
  fixtureType: 'up' | 'path' | 'gutter' | 'soffit' | 'hardscape' | 'transformer' | 'coredrill';
  name: string;
  description: string;
  unitPrice: number;
}

export interface QuickPrompt {
  label: string;
  text: string;
}

export interface Project {
  name: string;
  selectedPrompt: string;
}

export interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ClientDetails {
    name: string;
    email: string;
    phone: string;
    address: string;
}

export interface CompanyProfile {
    name: string;
    email: string;
    address: string;
    logo: string | null;
}

export interface QuoteData {
  lineItems: LineItem[];
  taxRate: number;
  discount?: number;
  clientDetails: ClientDetails;
  total: number;
}

export interface SavedProject {
  id: string;
  name: string;
  date: string;
  image: string | null;
  quote: QuoteData | null;
}

export type SubscriptionPlan = 'pro_monthly' | 'pro_yearly';

// BOM (Bill of Materials) Types
export interface BOMFixture {
  id: string;
  category: string;           // 'up', 'path', 'gutter', etc.
  name: string;               // Display name
  quantity: number;
  wattage: number;            // Per fixture wattage
  totalWattage: number;       // quantity * wattage
  sku?: string;               // Optional brand SKU
  brand?: string;             // e.g., 'FX Luminaire', 'Kichler'
}

export interface BOMData {
  fixtures: BOMFixture[];
  totalWattage: number;
  totalFixtures: number;
  recommendedTransformer: {
    name: string;             // e.g., '300W Transformer'
    watts: number;            // e.g., 300
    loadPercentage: number;   // e.g., 40 (meaning 40% capacity used)
  };
  wireEstimate: {
    gauge: string;            // '12/2', '10/2'
    footage: number;
    runsNeeded: number;
  };
  generatedAt: string;
}

export interface FixtureCatalogItem {
  fixtureType: 'up' | 'path' | 'gutter' | 'soffit' | 'hardscape' | 'coredrill';
  brand: string;              // User's preferred brand
  sku: string;                // User's SKU
  wattage: number;            // Actual wattage of their fixture
}
