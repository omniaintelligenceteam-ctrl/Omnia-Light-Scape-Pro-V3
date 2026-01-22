import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Check, Moon, Mail, MessageCircle, Sparkles,
  Volume2, VolumeX, ExternalLink, Loader2, Save, Plus, Trash2, Phone, LogOut, Download, FileJson
} from 'lucide-react';
import { SettingsNav, SettingsSection } from './SettingsNav';
import { SettingsCard } from './ui/SettingsCard';
import { ToggleRow } from './ui/SettingsToggle';
import { SettingsSlider } from './ui/SettingsSlider';
import { ChipSelect } from './ui/SegmentedControl';
import { ColorPicker } from './ui/ColorPicker';
import { CardInput } from './ui/PremiumInput';
import { COLOR_TEMPERATURES, BEAM_ANGLES, ACCENT_COLORS, FIXTURE_TYPE_NAMES } from '../../constants';
import { SettingsViewProps } from './types';
import { AIAssistant } from './AIAssistant';
import { LocationsSection } from './LocationsSection';
import { TechniciansSection } from './TechniciansSection';
import { TeamSection } from './TeamSection';
import { useOrganization } from '../../hooks/useOrganization';

export const SettingsDesktop: React.FC<SettingsViewProps> = ({
  profile,
  onProfileChange,
  colorTemp = '3000k',
  onColorTempChange,
  lightIntensity = 50,
  onLightIntensityChange,
  darknessLevel = 85,
  onDarknessLevelChange,
  beamAngle = 45,
  onBeamAngleChange,
  pricing,
  onPricingChange,
  customPricing = [],
  onCustomPricingChange,
  fixtureCatalog = [],
  onFixtureCatalogChange,
  subscription,
  onRequestUpgrade,
  theme = 'dark',
  onThemeChange,
  accentColor = 'gold',
  onAccentColorChange,
  fontSize = 'normal',
  onFontSizeChange,
  highContrast = false,
  onHighContrastChange,
  notifications,
  onNotificationsChange,
  followUpSettings,
  onFollowUpSettingsChange,
  businessGoals,
  onBusinessGoalChange,
  onSignOut,
  onSaveSettings,
  isSaving = false,
  onManageSubscription,
  isLoadingPortal = false,
  locations = [],
  locationsLoading = false,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
  technicians = [],
  techniciansLoading = false,
  onCreateTechnician,
  onUpdateTechnician,
  onDeleteTechnician
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [showAIChat, setShowAIChat] = useState(false);
  const { isOwner } = useOrganization();

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onProfileChange && profile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onProfileChange({ ...profile, logo: event.target.result as string });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getPlanDisplayName = (planId: string | null): string => {
    if (!planId) return 'Free';
    if (planId.toLowerCase().includes('starter')) return 'Starter';
    if (planId.toLowerCase().includes('pro')) return 'Pro';
    if (planId.toLowerCase().includes('business')) return 'Business';
    return 'Pro';
  };

  const contentVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-[#050505] via-[#080808] to-[#0a0a0a]">
      {/* Sidebar Navigation */}
      <SettingsNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onSignOut={onSignOut}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-8 py-5">
            <h1 className="text-2xl font-bold text-white capitalize">{activeSection}</h1>
            <div className="flex items-center gap-3">
              {onSaveSettings && (
                <motion.button
                  onClick={onSaveSettings}
                  disabled={isSaving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#F6B45A] text-black rounded-xl font-semibold text-sm disabled:opacity-50 shadow-[0_0_20px_rgba(246,180,90,0.2)] hover:shadow-[0_0_30px_rgba(246,180,90,0.3)] transition-all"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </motion.button>
              )}
              {onSignOut && (
                <motion.button
                  onClick={onSignOut}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 rounded-xl font-medium text-sm transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 max-w-3xl">
          <AnimatePresence mode="wait">
            {/* Profile Section */}
            {activeSection === 'profile' && profile && (
              <motion.div
                key="profile"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <p className="text-sm text-gray-400 mb-6">
                  Manage your company details that appear on quotes and invoices.
                </p>

                <SettingsCard className="p-6">
                  <div className="flex gap-8">
                    {/* Logo Upload */}
                    <div className="shrink-0">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 block">
                        Logo
                      </label>
                      <div className="relative w-28 h-28 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl flex items-center justify-center overflow-hidden hover:border-[#F6B45A]/50 transition-colors cursor-pointer group">
                        {profile.logo ? (
                          <img src={profile.logo} alt="Logo" className="w-full h-full object-contain p-3" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-[#F6B45A] transition-colors">
                            <Upload className="w-6 h-6" />
                            <span className="text-[10px] font-medium">Upload</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleLogoUpload}
                        />
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="flex-1 space-y-5">
                      <div className="grid grid-cols-2 gap-5">
                        <CardInput
                          label="Company Name"
                          value={profile.name}
                          onChange={(v) => onProfileChange?.({ ...profile, name: v })}
                          placeholder="Your company name"
                        />
                        <CardInput
                          label="Email"
                          value={profile.email}
                          onChange={(v) => onProfileChange?.({ ...profile, email: v })}
                          placeholder="contact@company.com"
                          type="email"
                        />
                      </div>
                      <CardInput
                        label="Phone Number"
                        value={profile.phone || ''}
                        onChange={(v) => onProfileChange?.({ ...profile, phone: v })}
                        placeholder="(555) 123-4567"
                        type="tel"
                      />
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                          Business Address
                        </label>
                        <textarea
                          value={profile.address}
                          onChange={(e) => onProfileChange?.({ ...profile, address: e.target.value })}
                          placeholder="Enter your business address"
                          rows={2}
                          className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-white text-sm
                            placeholder-gray-600 focus:border-[#F6B45A]/50 focus:outline-none resize-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </SettingsCard>
              </motion.div>
            )}

            {/* Appearance Section */}
            {activeSection === 'appearance' && (
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
                </SettingsCard>
              </motion.div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && notifications && (
              <motion.div
                key="notifications"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <p className="text-sm text-gray-400 mb-6">
                  Control how and when you receive notifications.
                </p>

                <SettingsCard className="p-6 space-y-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Email Notifications
                  </h3>
                  <ToggleRow
                    icon={Mail}
                    iconColor="text-blue-400"
                    title="Project Updates"
                    description="Get notified when projects are updated"
                    checked={notifications.emailProjectUpdates}
                    onChange={(v) => onNotificationsChange?.({ ...notifications, emailProjectUpdates: v })}
                  />
                  <ToggleRow
                    icon={MessageCircle}
                    iconColor="text-amber-400"
                    title="Quote Reminders"
                    description="Receive reminders for pending quotes"
                    checked={notifications.emailQuoteReminders}
                    onChange={(v) => onNotificationsChange?.({ ...notifications, emailQuoteReminders: v })}
                  />
                </SettingsCard>

                <SettingsCard className="p-6 space-y-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Other
                  </h3>
                  <ToggleRow
                    icon={Sparkles}
                    iconColor="text-purple-400"
                    title="Marketing Emails"
                    description="Product updates, tips, and offers"
                    checked={notifications.marketingEmails}
                    onChange={(v) => onNotificationsChange?.({ ...notifications, marketingEmails: v })}
                  />
                  <ToggleRow
                    icon={notifications.soundEffects ? Volume2 : VolumeX}
                    iconColor="text-rose-400"
                    title="Sound Effects"
                    description="Play sounds for notifications"
                    checked={notifications.soundEffects}
                    onChange={(v) => onNotificationsChange?.({ ...notifications, soundEffects: v })}
                  />
                </SettingsCard>
              </motion.div>
            )}

            {/* Pricing Section */}
            {activeSection === 'pricing' && pricing && (
              <motion.div
                key="pricing"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <p className="text-sm text-gray-400 mb-6">
                  Set your standard unit prices for auto-generated quotes.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Standard Pricing */}
                  {pricing.map((item, index) => (
                    <SettingsCard key={item.id} className="p-5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] font-bold uppercase bg-[#F6B45A] text-black px-2.5 py-1 rounded-full">
                          {item.fixtureType}
                        </span>
                      </div>
                      <div className="space-y-4">
                        <CardInput
                          label="Display Name"
                          value={item.name}
                          onChange={(v) => {
                            const newPricing = [...pricing];
                            newPricing[index] = { ...item, name: v };
                            onPricingChange?.(newPricing);
                          }}
                        />
                        <CardInput
                          label="Unit Price"
                          value={item.unitPrice}
                          onChange={(v) => {
                            const newPricing = [...pricing];
                            newPricing[index] = { ...item, unitPrice: parseFloat(v) || 0 };
                            onPricingChange?.(newPricing);
                          }}
                          prefix="$"
                          type="number"
                        />
                      </div>
                    </SettingsCard>
                  ))}

                  {/* Custom Pricing Items */}
                  {customPricing.map((item) => (
                    <SettingsCard key={item.id} className="p-5 hover:border-white/10 transition-colors relative group">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className="text-[10px] font-bold uppercase bg-emerald-500 text-black px-2.5 py-1 rounded-full">
                          Custom
                        </span>
                        <button
                          onClick={() => {
                            const updated = customPricing.filter(c => c.id !== item.id);
                            onCustomPricingChange?.(updated);
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <CardInput
                          label="Display Name"
                          value={item.name}
                          onChange={(v) => {
                            const updated = customPricing.map(c =>
                              c.id === item.id ? { ...c, name: v } : c
                            );
                            onCustomPricingChange?.(updated);
                          }}
                          placeholder="e.g., Well Light"
                        />
                        <CardInput
                          label="Unit Price"
                          value={item.unitPrice}
                          onChange={(v) => {
                            const updated = customPricing.map(c =>
                              c.id === item.id ? { ...c, unitPrice: parseFloat(v) || 0 } : c
                            );
                            onCustomPricingChange?.(updated);
                          }}
                          prefix="$"
                          type="number"
                        />
                      </div>
                    </SettingsCard>
                  ))}
                </div>

                {/* Add Custom Button */}
                <button
                  onClick={() => {
                    const newItem = {
                      id: `custom-${Date.now()}`,
                      name: '',
                      unitPrice: 0
                    };
                    onCustomPricingChange?.([...customPricing, newItem]);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-white/[0.02] border border-dashed border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/[0.03] transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Add Custom Fixture</span>
                </button>
              </motion.div>
            )}

            {/* Catalog Section */}
            {activeSection === 'catalog' && (
              <motion.div
                key="catalog"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <p className="text-sm text-gray-400 mb-6">
                  Configure your preferred fixture brands and SKUs for Bill of Materials.
                </p>

                <div className="space-y-4">
                  {(['up', 'path', 'gutter', 'soffit', 'hardscape', 'coredrill'] as const).map((type) => {
                    const item = fixtureCatalog.find(c => c.fixtureType === type) || {
                      fixtureType: type, brand: '', sku: '', wattage: 4
                    };
                    return (
                      <SettingsCard key={type} className="p-5 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-[10px] font-bold uppercase bg-[#F6B45A] text-black px-2.5 py-1 rounded-full">
                            {FIXTURE_TYPE_NAMES[type] || type}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <CardInput
                            label="Brand"
                            value={item.brand}
                            onChange={(v) => {
                              const updated = fixtureCatalog.map(c =>
                                c.fixtureType === type ? { ...c, brand: v } : c
                              );
                              if (!fixtureCatalog.find(c => c.fixtureType === type)) {
                                updated.push({ ...item, brand: v });
                              }
                              onFixtureCatalogChange?.(updated);
                            }}
                            placeholder="e.g., FX Luminaire"
                          />
                          <CardInput
                            label="SKU / Model"
                            value={item.sku}
                            onChange={(v) => {
                              const updated = fixtureCatalog.map(c =>
                                c.fixtureType === type ? { ...c, sku: v } : c
                              );
                              if (!fixtureCatalog.find(c => c.fixtureType === type)) {
                                updated.push({ ...item, sku: v });
                              }
                              onFixtureCatalogChange?.(updated);
                            }}
                            placeholder="e.g., PO-1LED"
                          />
                          <CardInput
                            label="Wattage"
                            value={item.wattage}
                            onChange={(v) => {
                              const updated = fixtureCatalog.map(c =>
                                c.fixtureType === type ? { ...c, wattage: parseInt(v) || 0 } : c
                              );
                              if (!fixtureCatalog.find(c => c.fixtureType === type)) {
                                updated.push({ ...item, wattage: parseInt(v) || 0 });
                              }
                              onFixtureCatalogChange?.(updated);
                            }}
                            type="number"
                            suffix="W"
                          />
                        </div>
                      </SettingsCard>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Lighting Section */}
            {activeSection === 'lighting' && (
              <motion.div
                key="lighting"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <p className="text-sm text-gray-400 mb-6">
                  Configure default lighting settings for image generation.
                </p>

                <SettingsCard className="p-6 space-y-8">
                  {/* Color Temperature */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4 block">
                      Default Color Temperature
                    </label>
                    <ChipSelect
                      options={COLOR_TEMPERATURES.slice(0, 4).map(t => ({
                        value: t.id,
                        label: t.kelvin,
                        sublabel: t.description,
                        color: t.color
                      }))}
                      value={colorTemp}
                      onChange={(v) => onColorTempChange?.(v)}
                      columns={4}
                    />
                  </div>

                  {/* Holiday Colors */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4 block">
                      Holiday & Seasonal
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {COLOR_TEMPERATURES.slice(4).map((temp) => (
                        <button
                          key={temp.id}
                          onClick={() => onColorTempChange?.(temp.id)}
                          className={`relative p-4 rounded-xl border flex items-center gap-4 transition-all hover:scale-[1.01] ${
                            colorTemp === temp.id
                              ? temp.id === 'christmas'
                                ? 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(220,38,38,0.15)]'
                                : 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(147,51,234,0.15)]'
                              : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                          }`}
                        >
                          <div className="flex gap-1.5">
                            {temp.id === 'christmas' ? (
                              <>
                                <div className="w-5 h-5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                                <div className="w-5 h-5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                              </>
                            ) : (
                              <>
                                <div className="w-5 h-5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                <div className="w-5 h-5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.5)]" />
                              </>
                            )}
                          </div>
                          <div className="text-left">
                            <span className={`text-sm font-semibold ${
                              colorTemp === temp.id
                                ? temp.id === 'christmas' ? 'text-red-400' : 'text-purple-400'
                                : 'text-white'
                            }`}>
                              {temp.description}
                            </span>
                            <span className="text-[10px] text-gray-500 block mt-0.5">{temp.kelvin}</span>
                          </div>
                          {colorTemp === temp.id && (
                            <div className={`absolute top-3 right-3 ${temp.id === 'christmas' ? 'text-red-400' : 'text-purple-400'}`}>
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Beam Angle */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4 block">
                      Default Beam Spread
                    </label>
                    <ChipSelect
                      options={BEAM_ANGLES.map(a => ({
                        value: a.id,
                        label: a.label,
                        sublabel: a.description
                      }))}
                      value={beamAngle}
                      onChange={(v) => onBeamAngleChange?.(v)}
                      columns={4}
                    />
                  </div>

                  {/* Sliders */}
                  <div className="grid grid-cols-2 gap-8 pt-4 border-t border-white/5">
                    {onLightIntensityChange && (
                      <SettingsSlider
                        label="Light Intensity"
                        value={lightIntensity}
                        onChange={onLightIntensityChange}
                      />
                    )}
                    {onDarknessLevelChange && (
                      <SettingsSlider
                        label="Sky Darkness"
                        value={darknessLevel}
                        onChange={onDarknessLevelChange}
                      />
                    )}
                  </div>
                </SettingsCard>
              </motion.div>
            )}

            {/* Follow-ups Section */}
            {activeSection === 'followups' && (
              <motion.div
                key="followups"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <p className="text-sm text-gray-400 mb-6">
                  Configure automatic follow-up reminders for quotes, invoices, and installations.
                </p>

                {/* Quote Follow-ups */}
                <SettingsCard className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Quote Reminders</h3>
                  <div className="space-y-4">
                    <ToggleRow
                      title="Enable quote reminders"
                      description="Automatically remind clients about pending quotes"
                      checked={followUpSettings?.enableQuoteReminders ?? true}
                      onChange={(checked) => onFollowUpSettingsChange?.({
                        ...followUpSettings!,
                        enableQuoteReminders: checked
                      })}
                    />
                    {followUpSettings?.enableQuoteReminders !== false && (
                      <>
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <span className="text-sm text-white">Reminder after</span>
                            <p className="text-xs text-gray-500">Days after quote is sent</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={14}
                              value={followUpSettings?.quoteReminderDays ?? 3}
                              onChange={(e) => onFollowUpSettingsChange?.({
                                ...followUpSettings!,
                                quoteReminderDays: parseInt(e.target.value) || 3
                              })}
                              className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center"
                            />
                            <span className="text-sm text-gray-400">days</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <span className="text-sm text-white">Expiration warning</span>
                            <p className="text-xs text-gray-500">Days before quote expires</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={7}
                              value={followUpSettings?.quoteExpiringDays ?? 2}
                              onChange={(e) => onFollowUpSettingsChange?.({
                                ...followUpSettings!,
                                quoteExpiringDays: parseInt(e.target.value) || 2
                              })}
                              className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center"
                            />
                            <span className="text-sm text-gray-400">days</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </SettingsCard>

                {/* Invoice Follow-ups */}
                <SettingsCard className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Invoice Reminders</h3>
                  <div className="space-y-4">
                    <ToggleRow
                      title="Enable invoice reminders"
                      description="Automatically remind clients about unpaid invoices"
                      checked={followUpSettings?.enableInvoiceReminders ?? true}
                      onChange={(checked) => onFollowUpSettingsChange?.({
                        ...followUpSettings!,
                        enableInvoiceReminders: checked
                      })}
                    />
                    {followUpSettings?.enableInvoiceReminders !== false && (
                      <>
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <span className="text-sm text-white">Payment reminder</span>
                            <p className="text-xs text-gray-500">Days after invoice sent</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={followUpSettings?.invoiceReminderDays ?? 7}
                              onChange={(e) => onFollowUpSettingsChange?.({
                                ...followUpSettings!,
                                invoiceReminderDays: parseInt(e.target.value) || 7
                              })}
                              className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center"
                            />
                            <span className="text-sm text-gray-400">days</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <span className="text-sm text-white">Overdue notice</span>
                            <p className="text-xs text-gray-500">Days after due date</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={7}
                              value={followUpSettings?.invoiceOverdueDays ?? 1}
                              onChange={(e) => onFollowUpSettingsChange?.({
                                ...followUpSettings!,
                                invoiceOverdueDays: parseInt(e.target.value) || 1
                              })}
                              className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center"
                            />
                            <span className="text-sm text-gray-400">days</span>
                          </div>
                        </div>
                        <ToggleRow
                          title="SMS for overdue invoices"
                          description="Send SMS reminders for overdue payments (requires phone number)"
                          checked={followUpSettings?.enableSmsForOverdue ?? false}
                          onChange={(checked) => onFollowUpSettingsChange?.({
                            ...followUpSettings!,
                            enableSmsForOverdue: checked
                          })}
                        />
                      </>
                    )}
                  </div>
                </SettingsCard>

                {/* Installation Reminders */}
                <SettingsCard className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Installation Reminders</h3>
                  <div className="space-y-4">
                    <ToggleRow
                      title="Enable pre-installation reminders"
                      description="Remind clients before their scheduled installation"
                      checked={followUpSettings?.enablePreInstallReminders ?? true}
                      onChange={(checked) => onFollowUpSettingsChange?.({
                        ...followUpSettings!,
                        enablePreInstallReminders: checked
                      })}
                    />
                    {followUpSettings?.enablePreInstallReminders !== false && (
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-sm text-white">Reminder before</span>
                          <p className="text-xs text-gray-500">Days before scheduled date</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={7}
                            value={followUpSettings?.preInstallationDays ?? 1}
                            onChange={(e) => onFollowUpSettingsChange?.({
                              ...followUpSettings!,
                              preInstallationDays: parseInt(e.target.value) || 1
                            })}
                            className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center"
                          />
                          <span className="text-sm text-gray-400">days</span>
                        </div>
                      </div>
                    )}
                  </div>
                </SettingsCard>
              </motion.div>
            )}

            {/* Goals Section */}
            {activeSection === 'goals' && (
              <motion.div
                key="goals"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <p className="text-sm text-gray-400 mb-6">
                  Set business goals to track your performance. Goals help you stay on track with revenue, projects, and client acquisition.
                </p>

                {/* Monthly Revenue Goal */}
                <SettingsCard className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Monthly Revenue Goal</h3>
                  <p className="text-sm text-gray-500 mb-4">Set your target monthly revenue to track progress throughout the month.</p>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="15000"
                      value={businessGoals?.find(g => g.goalType === 'revenue' && g.periodType === 'monthly' && g.year === new Date().getFullYear() && g.month === new Date().getMonth() + 1)?.targetValue || ''}
                      onChange={(e) => onBusinessGoalChange?.({
                        goalType: 'revenue',
                        periodType: 'monthly',
                        targetValue: parseInt(e.target.value) || 0,
                        year: new Date().getFullYear(),
                        month: new Date().getMonth() + 1
                      })}
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#F6B45A]/50 focus:outline-none"
                    />
                    <span className="text-sm text-gray-400">per month</span>
                  </div>
                </SettingsCard>

                {/* Yearly Revenue Goal */}
                <SettingsCard className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Yearly Revenue Goal</h3>
                  <p className="text-sm text-gray-500 mb-4">Set your annual revenue target for long-term tracking.</p>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      placeholder="180000"
                      value={businessGoals?.find(g => g.goalType === 'revenue' && g.periodType === 'yearly' && g.year === new Date().getFullYear())?.targetValue || ''}
                      onChange={(e) => onBusinessGoalChange?.({
                        goalType: 'revenue',
                        periodType: 'yearly',
                        targetValue: parseInt(e.target.value) || 0,
                        year: new Date().getFullYear()
                      })}
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#F6B45A]/50 focus:outline-none"
                    />
                    <span className="text-sm text-gray-400">per year</span>
                  </div>
                </SettingsCard>

                {/* Projects Completed Goal */}
                <SettingsCard className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Monthly Projects Goal</h3>
                  <p className="text-sm text-gray-500 mb-4">Target number of projects to complete each month.</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="10"
                      value={businessGoals?.find(g => g.goalType === 'projects_completed' && g.periodType === 'monthly' && g.year === new Date().getFullYear() && g.month === new Date().getMonth() + 1)?.targetValue || ''}
                      onChange={(e) => onBusinessGoalChange?.({
                        goalType: 'projects_completed',
                        periodType: 'monthly',
                        targetValue: parseInt(e.target.value) || 0,
                        year: new Date().getFullYear(),
                        month: new Date().getMonth() + 1
                      })}
                      className="w-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-center focus:border-[#F6B45A]/50 focus:outline-none"
                    />
                    <span className="text-sm text-gray-400">projects per month</span>
                  </div>
                </SettingsCard>

                {/* New Clients Goal */}
                <SettingsCard className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Monthly New Clients Goal</h3>
                  <p className="text-sm text-gray-500 mb-4">Target number of new clients to acquire each month.</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="5"
                      value={businessGoals?.find(g => g.goalType === 'new_clients' && g.periodType === 'monthly' && g.year === new Date().getFullYear() && g.month === new Date().getMonth() + 1)?.targetValue || ''}
                      onChange={(e) => onBusinessGoalChange?.({
                        goalType: 'new_clients',
                        periodType: 'monthly',
                        targetValue: parseInt(e.target.value) || 0,
                        year: new Date().getFullYear(),
                        month: new Date().getMonth() + 1
                      })}
                      className="w-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-center focus:border-[#F6B45A]/50 focus:outline-none"
                    />
                    <span className="text-sm text-gray-400">new clients per month</span>
                  </div>
                </SettingsCard>
              </motion.div>
            )}

            {/* Subscription Section */}
            {activeSection === 'subscription' && subscription && (
              <motion.div
                key="subscription"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <p className="text-sm text-gray-400 mb-6">
                  Manage your subscription and view usage.
                </p>

                <SettingsCard className="p-6">
                  <div className="flex items-start justify-between gap-8">
                    <div className="flex-1">
                      {/* Plan Badge */}
                      <div className="flex items-center gap-3 mb-6">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${
                          subscription.hasActiveSubscription
                            ? 'bg-[#F6B45A]/20 text-[#F6B45A] border border-[#F6B45A]/30'
                            : 'bg-white/10 text-gray-400 border border-white/10'
                        }`}>
                          {subscription.hasActiveSubscription ? getPlanDisplayName(subscription.plan) : 'Free Trial'}
                        </span>
                        {subscription.hasActiveSubscription && (
                          <span className="text-sm text-green-400 flex items-center gap-1.5">
                            <Check className="w-4 h-4" /> Active
                          </span>
                        )}
                      </div>

                      {/* Usage */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">
                            <span className="text-white font-semibold text-lg">
                              {subscription.hasActiveSubscription
                                ? subscription.generationCount
                                : subscription.freeTrialLimit - subscription.remainingFreeGenerations}
                            </span>
                            {' / '}
                            {subscription.hasActiveSubscription
                              ? subscription.monthlyLimit === -1 ? '∞' : subscription.monthlyLimit
                              : subscription.freeTrialLimit}
                            {' generations used'}
                          </span>
                          {subscription.monthlyLimit === -1 && subscription.hasActiveSubscription && (
                            <span className="text-[#F6B45A] font-bold text-sm">UNLIMITED</span>
                          )}
                        </div>
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              subscription.monthlyLimit === -1
                                ? 'bg-gradient-to-r from-[#F6B45A] to-[#ffc67a] animate-pulse'
                                : 'bg-[#F6B45A]'
                            }`}
                            style={{
                              width: subscription.monthlyLimit === -1
                                ? '100%'
                                : `${Math.min(100, (subscription.generationCount / (subscription.monthlyLimit || subscription.freeTrialLimit)) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="shrink-0">
                      {subscription.hasActiveSubscription ? (
                        <button
                          onClick={onManageSubscription}
                          disabled={isLoadingPortal}
                          className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                        >
                          {isLoadingPortal ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4" />
                              Manage Subscription
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={onRequestUpgrade}
                          className="flex items-center gap-2 px-6 py-3 bg-[#F6B45A] text-black rounded-xl text-sm font-bold shadow-[0_0_25px_rgba(246,180,90,0.3)] hover:shadow-[0_0_35px_rgba(246,180,90,0.4)] transition-all"
                        >
                          <Sparkles className="w-4 h-4" />
                          Upgrade Now
                        </button>
                      )}
                    </div>
                  </div>
                </SettingsCard>
              </motion.div>
            )}

            {/* Locations Section */}
            {activeSection === 'locations' && onCreateLocation && onUpdateLocation && onDeleteLocation && (
              <motion.div
                key="locations"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <LocationsSection
                  locations={locations}
                  isLoading={locationsLoading}
                  onCreateLocation={onCreateLocation}
                  onUpdateLocation={onUpdateLocation}
                  onDeleteLocation={onDeleteLocation}
                />
              </motion.div>
            )}

            {/* Technicians Section */}
            {activeSection === 'technicians' && onCreateTechnician && onUpdateTechnician && onDeleteTechnician && (
              <motion.div
                key="technicians"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <TechniciansSection
                  technicians={technicians}
                  locations={locations}
                  isLoading={techniciansLoading}
                  onCreateTechnician={onCreateTechnician}
                  onUpdateTechnician={onUpdateTechnician}
                  onDeleteTechnician={onDeleteTechnician}
                />
              </motion.div>
            )}

            {/* Team Section */}
            {activeSection === 'team' && (
              <motion.div
                key="team"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <TeamSection isOwner={isOwner} />
              </motion.div>
            )}

            {/* Support Section */}
            {activeSection === 'support' && (
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
                      onClick={() => {
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
                      }}
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
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const data = JSON.parse(event.target?.result as string);
                              if (data.version !== 1) {
                                alert('Invalid settings file version');
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
                              alert('Settings imported successfully!');
                            } catch {
                              alert('Failed to parse settings file. Please check the file format.');
                            }
                          };
                          reader.readAsText(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </SettingsCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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
    </div>
  );
};
