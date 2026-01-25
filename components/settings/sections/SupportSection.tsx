import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Mail, FileJson, Download, Upload } from 'lucide-react';
import { useSuccessToast, useErrorToast } from '../../Toast';
import { SettingsCard } from '../ui/SettingsCard';
import { AIAssistant } from '../AIAssistant';
import { CompanyProfile, FixturePricing, CustomPricingItem, FixtureCatalogItem, NotificationPreferences, AccentColor, FontSize } from '../../../types';

interface SupportSectionProps {
  profile?: CompanyProfile;
  onProfileChange?: (profile: CompanyProfile) => void;
  pricing?: FixturePricing[];
  onPricingChange?: (pricing: FixturePricing[]) => void;
  customPricing?: CustomPricingItem[];
  onCustomPricingChange?: (items: CustomPricingItem[]) => void;
  fixtureCatalog?: FixtureCatalogItem[];
  onFixtureCatalogChange?: (catalog: FixtureCatalogItem[]) => void;
  colorTemp?: string;
  onColorTempChange?: (tempId: string) => void;
  lightIntensity?: number;
  onLightIntensityChange?: (val: number) => void;
  darknessLevel?: number;
  onDarknessLevelChange?: (val: number) => void;
  beamAngle?: number;
  onBeamAngleChange?: (angle: number) => void;
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  accentColor?: AccentColor;
  onAccentColorChange?: (color: AccentColor) => void;
  fontSize?: FontSize;
  onFontSizeChange?: (size: FontSize) => void;
  highContrast?: boolean;
  onHighContrastChange?: (enabled: boolean) => void;
  notifications?: NotificationPreferences;
  onNotificationsChange?: (prefs: NotificationPreferences) => void;
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const SupportSection: React.FC<SupportSectionProps> = ({
  profile,
  onProfileChange,
  pricing,
  onPricingChange,
  customPricing,
  onCustomPricingChange,
  fixtureCatalog,
  onFixtureCatalogChange,
  colorTemp,
  onColorTempChange,
  lightIntensity,
  onLightIntensityChange,
  darknessLevel,
  onDarknessLevelChange,
  beamAngle,
  onBeamAngleChange,
  theme,
  onThemeChange,
  accentColor,
  onAccentColorChange,
  fontSize,
  onFontSizeChange,
  highContrast,
  onHighContrastChange,
  notifications,
  onNotificationsChange
}) => {
  const [showAIChat, setShowAIChat] = useState(false);
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const handleExportSettings = () => {
    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      companyProfile: profile,
      pricing: pricing,
      customPricing: customPricing,
      fixtureCatalog: fixtureCatalog,
      colorTemperature: colorTemp,
      lightIntensity: lightIntensity,
      darknessLevel: darknessLevel,
      beamAngle: beamAngle,
      theme: theme,
      accentColor: accentColor,
      fontSize: fontSize,
      highContrast: highContrast,
      notifications: notifications,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnia-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.version !== 1) {
          errorToast('Invalid settings file version');
          return;
        }
        if (data.companyProfile && onProfileChange) onProfileChange(data.companyProfile);
        if (data.pricing && onPricingChange) onPricingChange(data.pricing);
        if (data.customPricing && onCustomPricingChange) onCustomPricingChange(data.customPricing);
        if (data.fixtureCatalog && onFixtureCatalogChange) onFixtureCatalogChange(data.fixtureCatalog);
        if (data.colorTemperature && onColorTempChange) onColorTempChange(data.colorTemperature);
        if (data.lightIntensity !== undefined && onLightIntensityChange) onLightIntensityChange(data.lightIntensity);
        if (data.darknessLevel !== undefined && onDarknessLevelChange) onDarknessLevelChange(data.darknessLevel);
        if (data.beamAngle !== undefined && onBeamAngleChange) onBeamAngleChange(data.beamAngle);
        if (data.theme && onThemeChange) onThemeChange(data.theme);
        if (data.accentColor && onAccentColorChange) onAccentColorChange(data.accentColor);
        if (data.fontSize && onFontSizeChange) onFontSizeChange(data.fontSize);
        if (data.highContrast !== undefined && onHighContrastChange) onHighContrastChange(data.highContrast);
        if (data.notifications && onNotificationsChange) onNotificationsChange(data.notifications);
        successToast('Settings imported successfully!');
      } catch {
        errorToast('Failed to parse settings file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <motion.div
        key="support"
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        <p className="text-sm text-gray-400 mb-6">
          Get help with using the app or contact our support team.
        </p>

        {/* AI Assistant */}
        <SettingsCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#F6B45A] flex items-center justify-center shadow-[0_0_20px_rgba(246,180,90,0.3)]">
                <Sparkles className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Omnia AI Assistant</h3>
                <p className="text-sm text-gray-400">Ask anything about the app</p>
              </div>
            </div>
            <button
              onClick={() => setShowAIChat(true)}
              className="px-5 py-2.5 bg-[#F6B45A]/10 border border-[#F6B45A]/30 text-[#F6B45A] rounded-xl font-semibold text-sm hover:bg-[#F6B45A]/20 transition-colors"
            >
              Open Chat
            </button>
          </div>
        </SettingsCard>

        {/* Email Support */}
        <SettingsCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <Mail className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Email Support</h3>
                <p className="text-sm text-gray-400 font-mono">omniaintelligenceteam@gmail.com</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText('omniaintelligenceteam@gmail.com')}
                className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Copy
              </button>
              <a
                href="mailto:omniaintelligenceteam@gmail.com"
                className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/15 transition-colors"
              >
                Send Email
              </a>
            </div>
          </div>
        </SettingsCard>

        {/* Backup & Restore */}
        <SettingsCard className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <FileJson className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Backup & Restore</h3>
              <p className="text-sm text-gray-400">Export or import your settings</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportSettings}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all text-sm font-semibold"
            >
              <Download className="w-4 h-4" />
              Export Settings
            </button>
            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all text-sm font-semibold cursor-pointer">
              <Upload className="w-4 h-4" />
              Import Settings
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportSettings}
              />
            </label>
          </div>
        </SettingsCard>
      </motion.div>

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg mx-4"
          >
            <AIAssistant onClose={() => setShowAIChat(false)} />
          </motion.div>
        </div>
      )}
    </>
  );
};
