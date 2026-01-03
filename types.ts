
export interface ColorTemperature {
  id: string;
  kelvin: string;
  color: string;
  description: string;
  prompt?: string;
}

export interface FixturePricing {
  id: string;
  fixtureType: 'up' | 'path' | 'gutter' | 'soffit' | 'hardscape' | 'transformer';
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