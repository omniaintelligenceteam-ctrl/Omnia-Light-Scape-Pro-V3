import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Palette, Bell, DollarSign, Package, Lightbulb, CreditCard,
  HelpCircle, LogOut, Save, Loader2, Upload, Check, Sun, Moon,
  Mail, MessageCircle, Sparkles, Volume2, VolumeX, ExternalLink, Plus, Trash2, Phone
} from 'lucide-react';
import { ExpandableCard } from './ui/SettingsCard';
import { ToggleRow, SettingsToggle } from './ui/SettingsToggle';
import { SettingsSlider } from './ui/SettingsSlider';
import { ChipSelect } from './ui/SegmentedControl';
import { ColorPicker } from './ui/ColorPicker';
import { CardInput } from './ui/PremiumInput';
import { COLOR_TEMPERATURES, BEAM_ANGLES, ACCENT_COLORS, FIXTURE_TYPE_NAMES } from '../../constants';
import { SettingsViewProps } from './types';
import { AIAssistant } from './AIAssistant';

export const SettingsMobile: React.FC<SettingsViewProps> = ({
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
  userId,
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
  onSignOut,
  onSaveSettings,
  isSaving = false,
  onManageSubscription,
  isLoadingPortal = false
}) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

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

  return (
    <div className="min-h-full bg-gradient-to-b from-[#050505] to-[#0a0a0a]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-white">Settings</h1>
          {onSaveSettings && (
            <motion.button
              onClick={onSaveSettings}
              disabled={isSaving}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-[#F6B45A] text-black rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving' : 'Save'}
            </motion.button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3 pb-32">

        {/* Profile & Branding */}
        <ExpandableCard
          icon={User}
          title="Profile & Branding"
          description="Company details"
          isOpen={activeSection === 'profile'}
          onToggle={() => toggleSection('profile')}
        >
          {profile && (
            <div className="space-y-5">
              {/* Logo Upload */}
              <div className="flex justify-center">
                <div className="relative w-24 h-24 bg-white/[0.03] border border-dashed border-white/20 rounded-2xl flex items-center justify-center overflow-hidden group">
                  {profile.logo ? (
                    <img src={profile.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-500">
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
              <CardInput
                label="Phone Number"
                value={profile.phone || ''}
                onChange={(v) => onProfileChange?.({ ...profile, phone: v })}
                placeholder="(555) 123-4567"
                type="tel"
              />
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Address
                </label>
                <textarea
                  value={profile.address}
                  onChange={(e) => onProfileChange?.({ ...profile, address: e.target.value })}
                  placeholder="Business address"
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-white text-sm
                    placeholder-gray-600 focus:border-[#F6B45A]/50 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}
        </ExpandableCard>

        {/* Appearance */}
        <ExpandableCard
          icon={Palette}
          title="Appearance"
          description="Theme & colors"
          isOpen={activeSection === 'appearance'}
          onToggle={() => toggleSection('appearance')}
        >
          <div className="space-y-6">
            {/* Theme Toggle */}
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 block">
                Theme
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onThemeChange?.('light')}
                  className={`relative p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    theme === 'light'
                      ? 'border-[#F6B45A] bg-[#F6B45A]/10'
                      : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                    <Sun className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className={`text-sm font-medium ${theme === 'light' ? 'text-[#F6B45A]' : 'text-gray-400'}`}>
                    Light
                  </span>
                  {theme === 'light' && (
                    <div className="absolute top-2 right-2 text-[#F6B45A]">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
                <button
                  onClick={() => onThemeChange?.('dark')}
                  className={`relative p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    theme === 'dark'
                      ? 'border-[#F6B45A] bg-[#F6B45A]/10'
                      : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                    <Moon className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-[#F6B45A]' : 'text-gray-400'}`}>
                    Dark
                  </span>
                  {theme === 'dark' && (
                    <div className="absolute top-2 right-2 text-[#F6B45A]">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 block">
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
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 block">
                Text Size
              </label>
              <ChipSelect
                options={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'comfortable', label: 'Large' }
                ]}
                value={fontSize}
                onChange={(v) => onFontSizeChange?.(v as typeof fontSize)}
                columns={3}
              />
            </div>

            {/* High Contrast */}
            <ToggleRow
              title="High Contrast"
              description="Increase visibility"
              checked={highContrast}
              onChange={(v) => onHighContrastChange?.(v)}
            />
          </div>
        </ExpandableCard>

        {/* Notifications */}
        <ExpandableCard
          icon={Bell}
          title="Notifications"
          description="Email & alerts"
          isOpen={activeSection === 'notifications'}
          onToggle={() => toggleSection('notifications')}
        >
          {notifications && (
            <div className="space-y-3">
              <ToggleRow
                icon={Mail}
                iconColor="text-blue-400"
                title="Project Updates"
                description="Get notified when status changes"
                checked={notifications.emailProjectUpdates}
                onChange={(v) => onNotificationsChange?.({ ...notifications, emailProjectUpdates: v })}
              />
              <ToggleRow
                icon={MessageCircle}
                iconColor="text-amber-400"
                title="Quote Reminders"
                description="Reminders for pending quotes"
                checked={notifications.emailQuoteReminders}
                onChange={(v) => onNotificationsChange?.({ ...notifications, emailQuoteReminders: v })}
              />
              <ToggleRow
                icon={MessageCircle}
                iconColor="text-green-400"
                title="SMS Notifications"
                description="Receive text updates"
                checked={notifications.smsNotifications}
                onChange={(v) => onNotificationsChange?.({ ...notifications, smsNotifications: v })}
              />
              <ToggleRow
                icon={Sparkles}
                iconColor="text-purple-400"
                title="Marketing"
                description="Product updates & offers"
                checked={notifications.marketingEmails}
                onChange={(v) => onNotificationsChange?.({ ...notifications, marketingEmails: v })}
              />
              <ToggleRow
                icon={notifications.soundEffects ? Volume2 : VolumeX}
                iconColor="text-rose-400"
                title="Sound Effects"
                description="Play notification sounds"
                checked={notifications.soundEffects}
                onChange={(v) => onNotificationsChange?.({ ...notifications, soundEffects: v })}
              />
            </div>
          )}
        </ExpandableCard>

        {/* Pricing */}
        <ExpandableCard
          icon={DollarSign}
          title="Pricing"
          description="Fixture costs"
          isOpen={activeSection === 'pricing'}
          onToggle={() => toggleSection('pricing')}
        >
          <div className="space-y-4">
            {/* Standard Pricing */}
            {pricing && pricing.map((item, index) => (
              <div key={item.id} className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#F6B45A] uppercase">
                    {item.fixtureType}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CardInput
                    label="Name"
                    value={item.name}
                    onChange={(v) => {
                      const newPricing = [...pricing];
                      newPricing[index] = { ...item, name: v };
                      onPricingChange?.(newPricing);
                    }}
                  />
                  <CardInput
                    label="Price"
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
              </div>
            ))}

            {/* Custom Pricing Items */}
            {customPricing.length > 0 && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Custom Items
                </p>
                {customPricing.map((item) => (
                  <div key={item.id} className="bg-white/[0.02] rounded-xl p-4 border border-white/5 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-emerald-400 uppercase">
                        Custom
                      </span>
                      <button
                        onClick={() => {
                          const updated = customPricing.filter(c => c.id !== item.id);
                          onCustomPricingChange?.(updated);
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <CardInput
                        label="Name"
                        value={item.name}
                        onChange={(v) => {
                          const updated = customPricing.map(c =>
                            c.id === item.id ? { ...c, name: v } : c
                          );
                          onCustomPricingChange?.(updated);
                        }}
                      />
                      <CardInput
                        label="Price"
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
                  </div>
                ))}
              </div>
            )}

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
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/[0.03] border border-dashed border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Custom Fixture</span>
            </button>
          </div>
        </ExpandableCard>

        {/* Fixture Catalog */}
        <ExpandableCard
          icon={Package}
          title="Fixture Catalog"
          description="Brands & SKUs"
          isOpen={activeSection === 'catalog'}
          onToggle={() => toggleSection('catalog')}
        >
          <div className="space-y-4">
            {(['up', 'path', 'gutter', 'soffit', 'hardscape', 'coredrill'] as const).map((type) => {
              const item = fixtureCatalog.find(c => c.fixtureType === type) || {
                fixtureType: type, brand: '', sku: '', wattage: 4
              };
              return (
                <div key={type} className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                  <span className="text-xs font-semibold text-[#F6B45A] uppercase mb-3 block">
                    {FIXTURE_TYPE_NAMES[type] || type}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
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
                      placeholder="Brand"
                    />
                    <CardInput
                      label="SKU"
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
                      placeholder="SKU"
                    />
                    <CardInput
                      label="Watts"
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
                </div>
              );
            })}
          </div>
        </ExpandableCard>

        {/* Lighting Defaults */}
        <ExpandableCard
          icon={Lightbulb}
          title="Lighting Defaults"
          description="Color temp & beam"
          isOpen={activeSection === 'lighting'}
          onToggle={() => toggleSection('lighting')}
        >
          <div className="space-y-6">
            {/* Color Temperature */}
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 block">
                Color Temperature
              </label>
              <ChipSelect
                options={COLOR_TEMPERATURES.slice(0, 4).map(t => ({
                  value: t.id,
                  label: t.kelvin,
                  color: t.color
                }))}
                value={colorTemp}
                onChange={(v) => onColorTempChange?.(v)}
                columns={4}
              />
            </div>

            {/* Holiday Colors */}
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 block">
                Holiday Options
              </label>
              <div className="grid grid-cols-2 gap-3">
                {COLOR_TEMPERATURES.slice(4).map((temp) => (
                  <button
                    key={temp.id}
                    onClick={() => onColorTempChange?.(temp.id)}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                      colorTemp === temp.id
                        ? temp.id === 'christmas'
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-purple-500 bg-purple-500/10'
                        : 'border-white/5 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex gap-1">
                      {temp.id === 'christmas' ? (
                        <>
                          <div className="w-4 h-4 rounded-full bg-red-500" />
                          <div className="w-4 h-4 rounded-full bg-green-500" />
                        </>
                      ) : (
                        <>
                          <div className="w-4 h-4 rounded-full bg-orange-500" />
                          <div className="w-4 h-4 rounded-full bg-purple-500" />
                        </>
                      )}
                    </div>
                    <span className="text-xs font-medium text-white">{temp.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Beam Angle */}
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 block">
                Beam Angle
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
            <div className="space-y-5 pt-2">
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
          </div>
        </ExpandableCard>

        {/* Subscription */}
        {subscription && (
          <ExpandableCard
            icon={CreditCard}
            title="Subscription"
            description="Plan & usage"
            isOpen={activeSection === 'subscription'}
            onToggle={() => toggleSection('subscription')}
          >
            <div className="space-y-4">
              {/* Plan Badge */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${
                  subscription.hasActiveSubscription
                    ? 'bg-[#F6B45A]/20 text-[#F6B45A]'
                    : 'bg-white/10 text-gray-400'
                }`}>
                  {subscription.hasActiveSubscription ? getPlanDisplayName(subscription.plan) : 'Free Trial'}
                </span>
                {subscription.hasActiveSubscription && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </div>

              {/* Usage Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">
                    <span className="text-white font-semibold">
                      {subscription.hasActiveSubscription
                        ? subscription.generationCount
                        : subscription.freeTrialLimit - subscription.remainingFreeGenerations}
                    </span>
                    {' / '}
                    {subscription.hasActiveSubscription
                      ? subscription.monthlyLimit === -1 ? '∞' : subscription.monthlyLimit
                      : subscription.freeTrialLimit}
                    {' used'}
                  </span>
                  {subscription.monthlyLimit === -1 && subscription.hasActiveSubscription && (
                    <span className="text-[#F6B45A] font-semibold">UNLIMITED</span>
                  )}
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F6B45A] rounded-full transition-all"
                    style={{
                      width: subscription.monthlyLimit === -1
                        ? '100%'
                        : `${Math.min(100, (subscription.generationCount / (subscription.monthlyLimit || subscription.freeTrialLimit)) * 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Action Button */}
              {subscription.hasActiveSubscription ? (
                <button
                  onClick={onManageSubscription}
                  disabled={isLoadingPortal}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
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
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#F6B45A] rounded-xl text-sm font-semibold text-black"
                >
                  <Sparkles className="w-4 h-4" />
                  Upgrade Now
                </button>
              )}
            </div>
          </ExpandableCard>
        )}

        {/* Help & Support */}
        <ExpandableCard
          icon={HelpCircle}
          title="Help & Support"
          description="AI assistant & contact"
          isOpen={activeSection === 'support'}
          onToggle={() => toggleSection('support')}
        >
          <div className="space-y-3">
            {/* AI Assistant */}
            <button
              onClick={() => setShowAIChat(true)}
              className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-[#F6B45A]/10 to-transparent rounded-xl border border-[#F6B45A]/20"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F6B45A] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-white">Omnia AI Assistant</p>
                <p className="text-xs text-gray-400">Ask anything about the app</p>
              </div>
            </button>

            {/* Email Support */}
            <a
              href="mailto:omniaintelligenceteam@gmail.com"
              className="w-full flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/5"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-white">Email Support</p>
                <p className="text-xs text-gray-400">omniaintelligenceteam@gmail.com</p>
              </div>
            </a>
          </div>
        </ExpandableCard>

        {/* Sign Out */}
        {onSignOut && (
          <motion.button
            onClick={onSignOut}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 py-4 mt-4 bg-white/[0.03] rounded-2xl border border-white/5 text-gray-400 active:bg-red-500/10 active:text-red-400 active:border-red-500/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">Sign Out</span>
          </motion.button>
        )}
      </div>

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
          <div className="h-full flex flex-col">
            <AIAssistant onClose={() => setShowAIChat(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
