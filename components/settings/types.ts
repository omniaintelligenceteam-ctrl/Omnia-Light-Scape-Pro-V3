import { CompanyProfile, FixturePricing, FixtureCatalogItem, AccentColor, FontSize, NotificationPreferences, CustomPricingItem } from '../../types';

export interface SubscriptionInfo {
  hasActiveSubscription: boolean;
  plan: string | null;
  remainingFreeGenerations: number;
  freeTrialLimit: number;
  generationCount: number;
  monthlyLimit?: number;
}

export interface SettingsViewProps {
  profile?: CompanyProfile;
  onProfileChange?: (profile: CompanyProfile) => void;
  colorTemp?: string;
  onColorTempChange?: (tempId: string) => void;
  lightIntensity?: number;
  onLightIntensityChange?: (val: number) => void;
  darknessLevel?: number;
  onDarknessLevelChange?: (val: number) => void;
  beamAngle?: number;
  onBeamAngleChange?: (angle: number) => void;
  pricing?: FixturePricing[];
  onPricingChange?: (pricing: FixturePricing[]) => void;
  customPricing?: CustomPricingItem[];
  onCustomPricingChange?: (items: CustomPricingItem[]) => void;
  fixtureCatalog?: FixtureCatalogItem[];
  onFixtureCatalogChange?: (catalog: FixtureCatalogItem[]) => void;
  subscription?: SubscriptionInfo;
  userId?: string;
  onRequestUpgrade?: () => void;
  // Theme props
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  accentColor?: AccentColor;
  onAccentColorChange?: (color: AccentColor) => void;
  fontSize?: FontSize;
  onFontSizeChange?: (size: FontSize) => void;
  highContrast?: boolean;
  onHighContrastChange?: (enabled: boolean) => void;
  // Notification props
  notifications?: NotificationPreferences;
  onNotificationsChange?: (prefs: NotificationPreferences) => void;
  // Sign out
  onSignOut?: () => void;
  // Save all settings
  onSaveSettings?: () => void;
  isSaving?: boolean;
  // Portal management
  onManageSubscription?: () => void;
  isLoadingPortal?: boolean;
}
