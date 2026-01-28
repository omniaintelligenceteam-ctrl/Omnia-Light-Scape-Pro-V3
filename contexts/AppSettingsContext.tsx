import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { AccentColor, FontSize, NotificationPreferences } from '../types';

interface AppSettings {
  // Theme
  theme: 'light' | 'dark';
  accentColor: AccentColor;
  fontSize: FontSize;
  highContrast: boolean;
  
  // Editor preferences
  enableBeforeAfter: boolean;
  
  // Lighting defaults
  colorTemp: string;
  lightIntensity: number;
  darknessLevel: number;
  beamAngle: number;
  
  // Notifications
  notifications: NotificationPreferences;
}

interface AppSettingsContextType extends AppSettings {
  // Theme setters
  setTheme: (theme: 'light' | 'dark') => void;
  setAccentColor: (color: AccentColor) => void;
  setFontSize: (size: FontSize) => void;
  setHighContrast: (enabled: boolean) => void;
  
  // Editor preference setters
  setEnableBeforeAfter: (enabled: boolean) => void;
  
  // Lighting setters
  setColorTemp: (temp: string) => void;
  setLightIntensity: (intensity: number) => void;
  setDarknessLevel: (level: number) => void;
  setBeamAngle: (angle: number) => void;
  
  // Notification setters
  setNotifications: (prefs: NotificationPreferences) => void;
  updateNotification: (key: keyof NotificationPreferences, value: boolean) => void;
  
  // Utility
  resetToDefaults: () => void;
}

const defaultNotifications: NotificationPreferences = {
  emailProjectUpdates: true,
  emailQuoteReminders: true,
  smsNotifications: false,
  marketingEmails: false,
  soundEffects: true,
};

const defaultSettings: AppSettings = {
  theme: 'dark',
  accentColor: 'gold',
  fontSize: 'normal',
  highContrast: false,
  enableBeforeAfter: true,
  colorTemp: '3000k',
  lightIntensity: 45,
  darknessLevel: 85,
  beamAngle: 30,
  notifications: defaultNotifications,
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  // Theme state
  const [theme, setThemeState] = useState<'light' | 'dark'>(defaultSettings.theme);
  const [accentColor, setAccentColorState] = useState<AccentColor>(defaultSettings.accentColor);
  const [fontSize, setFontSizeState] = useState<FontSize>(defaultSettings.fontSize);
  const [highContrast, setHighContrastState] = useState<boolean>(defaultSettings.highContrast);
  
  // Editor preferences
  const [enableBeforeAfter, setEnableBeforeAfterState] = useState<boolean>(defaultSettings.enableBeforeAfter);
  
  // Lighting defaults
  const [colorTemp, setColorTempState] = useState<string>(defaultSettings.colorTemp);
  const [lightIntensity, setLightIntensityState] = useState<number>(defaultSettings.lightIntensity);
  const [darknessLevel, setDarknessLevelState] = useState<number>(defaultSettings.darknessLevel);
  const [beamAngle, setBeamAngleState] = useState<number>(defaultSettings.beamAngle);
  
  // Notifications
  const [notifications, setNotificationsState] = useState<NotificationPreferences>(defaultSettings.notifications);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const savedTheme = localStorage.getItem('omnia_theme');
      if (savedTheme) {
        const prefs = JSON.parse(savedTheme);
        if (prefs.theme) setThemeState(prefs.theme);
        if (prefs.accentColor) setAccentColorState(prefs.accentColor);
        if (prefs.fontSize) setFontSizeState(prefs.fontSize);
        if (typeof prefs.highContrast === 'boolean') setHighContrastState(prefs.highContrast);
        if (typeof prefs.enableBeforeAfter === 'boolean') setEnableBeforeAfterState(prefs.enableBeforeAfter);
      }
      
      const savedNotifs = localStorage.getItem('omnia_notifications');
      if (savedNotifs) {
        setNotificationsState(JSON.parse(savedNotifs));
      }
      
      const savedLighting = localStorage.getItem('omnia_lighting');
      if (savedLighting) {
        const lighting = JSON.parse(savedLighting);
        if (lighting.colorTemp) setColorTempState(lighting.colorTemp);
        if (typeof lighting.lightIntensity === 'number') setLightIntensityState(lighting.lightIntensity);
        if (typeof lighting.darknessLevel === 'number') setDarknessLevelState(lighting.darknessLevel);
        if (typeof lighting.beamAngle === 'number') setBeamAngleState(lighting.beamAngle);
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage', e);
    }
  }, []);

  // Apply theme to document and persist
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', accentColor);
    document.documentElement.setAttribute('data-fontsize', fontSize);
    document.documentElement.setAttribute('data-high-contrast', String(highContrast));
    
    localStorage.setItem('omnia_theme', JSON.stringify({
      theme,
      accentColor,
      fontSize,
      highContrast,
      enableBeforeAfter,
    }));
  }, [theme, accentColor, fontSize, highContrast, enableBeforeAfter]);

  // Persist notifications
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('omnia_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Persist lighting settings
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('omnia_lighting', JSON.stringify({
      colorTemp,
      lightIntensity,
      darknessLevel,
      beamAngle,
    }));
  }, [colorTemp, lightIntensity, darknessLevel, beamAngle]);

  // Wrapped setters for type safety
  const setTheme = useCallback((value: 'light' | 'dark') => setThemeState(value), []);
  const setAccentColor = useCallback((value: AccentColor) => setAccentColorState(value), []);
  const setFontSize = useCallback((value: FontSize) => setFontSizeState(value), []);
  const setHighContrast = useCallback((value: boolean) => setHighContrastState(value), []);
  const setEnableBeforeAfter = useCallback((value: boolean) => setEnableBeforeAfterState(value), []);
  const setColorTemp = useCallback((value: string) => setColorTempState(value), []);
  const setLightIntensity = useCallback((value: number) => setLightIntensityState(value), []);
  const setDarknessLevel = useCallback((value: number) => setDarknessLevelState(value), []);
  const setBeamAngle = useCallback((value: number) => setBeamAngleState(value), []);
  const setNotifications = useCallback((value: NotificationPreferences) => setNotificationsState(value), []);

  const updateNotification = useCallback((key: keyof NotificationPreferences, value: boolean) => {
    setNotificationsState(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setThemeState(defaultSettings.theme);
    setAccentColorState(defaultSettings.accentColor);
    setFontSizeState(defaultSettings.fontSize);
    setHighContrastState(defaultSettings.highContrast);
    setEnableBeforeAfterState(defaultSettings.enableBeforeAfter);
    setColorTempState(defaultSettings.colorTemp);
    setLightIntensityState(defaultSettings.lightIntensity);
    setDarknessLevelState(defaultSettings.darknessLevel);
    setBeamAngleState(defaultSettings.beamAngle);
    setNotificationsState(defaultNotifications);
  }, []);

  const value: AppSettingsContextType = {
    // State
    theme,
    accentColor,
    fontSize,
    highContrast,
    enableBeforeAfter,
    colorTemp,
    lightIntensity,
    darknessLevel,
    beamAngle,
    notifications,
    
    // Setters
    setTheme,
    setAccentColor,
    setFontSize,
    setHighContrast,
    setEnableBeforeAfter,
    setColorTemp,
    setLightIntensity,
    setDarknessLevel,
    setBeamAngle,
    setNotifications,
    updateNotification,
    
    // Utility
    resetToDefaults,
  };

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextType {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}

// Export for convenience
export type { AppSettings, AppSettingsContextType };
