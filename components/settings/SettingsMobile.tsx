import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Palette, Bell, DollarSign, Package, Lightbulb, CreditCard,
  HelpCircle, LogOut, Save, Loader2, Upload, Check, Sun, Moon,
  Mail, MessageCircle, Sparkles, Volume2, VolumeX, ExternalLink, Plus, Trash2, Phone,
  X, ChevronRight
} from 'lucide-react';
import { ToggleRow } from './ui/SettingsToggle';
import { SettingsSlider } from './ui/SettingsSlider';
import { ChipSelect } from './ui/SegmentedControl';
import { ColorPicker } from './ui/ColorPicker';
import { CardInput } from './ui/PremiumInput';
import { COLOR_TEMPERATURES, BEAM_ANGLES, ACCENT_COLORS, FIXTURE_TYPE_NAMES } from '../../constants';
import { SettingsViewProps } from './types';
import { AIAssistant } from './AIAssistant';

// Menu item button component
const MenuButton: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon: Icon, title, description, onClick }) => (
  <motion.button
    onClick={onClick}
    whileTap={{ scale: 0.98 }}
    className="w-full flex items-center gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5 active:bg-white/[0.05] transition-colors"
  >
    <div className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-gray-400" />
    </div>
    <div className="flex-1 text-left">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-600" />
  </motion.button>
);

// Full screen modal wrapper
const FullScreenModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSave?: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, onSave, children }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#050505]"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="h-full flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 bg-[#050505]">
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {onSave ? (
              <button
                onClick={() => {
                  onSave();
                  onClose();
                }}
                className="px-4 py-2 bg-[#F6B45A] text-black rounded-xl font-semibold text-sm"
              >
                Done
              </button>
            ) : (
              <div className="w-10" /> // Spacer
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-6 pb-20">
            {children}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

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
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);

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
      {/* Header */}
      <div className="px-4 py-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your preferences</p>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-gray-300 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 py-4 space-y-3 pb-32">

        {/* Profile & Branding */}
        <MenuButton
          icon={User}
          title="Profile & Branding"
          description="Company details & logo"
          onClick={() => setActiveModal('profile')}
        />

        {/* Appearance */}
        <MenuButton
          icon={Palette}
          title="Appearance"
          description="Theme & colors"
          onClick={() => setActiveModal('appearance')}
        />

        {/* Notifications */}
        <MenuButton
          icon={Bell}
          title="Notifications"
          description="Email & alerts"
          onClick={() => setActiveModal('notifications')}
        />

        {/* Pricing */}
        <MenuButton
          icon={DollarSign}
          title="Pricing"
          description="Fixture costs"
          onClick={() => setActiveModal('pricing')}
        />

        {/* Fixture Catalog */}
        <MenuButton
          icon={Package}
          title="Fixture Catalog"
          description="Brands & SKUs"
          onClick={() => setActiveModal('catalog')}
        />

        {/* Lighting Defaults */}
        <MenuButton
          icon={Lightbulb}
          title="Lighting Defaults"
          description="Color temp & beam angle"
          onClick={() => setActiveModal('lighting')}
        />

        {/* Subscription */}
        {subscription && (
          <MenuButton
            icon={CreditCard}
            title="Subscription"
            description={subscription.hasActiveSubscription ? getPlanDisplayName(subscription.plan) : 'Free Trial'}
            onClick={() => setActiveModal('subscription')}
          />
        )}

        {/* Help & Support */}
        <MenuButton
          icon={HelpCircle}
          title="Help & Support"
          description="AI assistant & contact"
          onClick={() => setActiveModal('support')}
        />

        {/* Sign Out */}
        {onSignOut && (
          <motion.button
            onClick={onSignOut}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 py-4 mt-6 bg-white/[0.02] rounded-2xl border border-white/5 text-gray-400 active:bg-red-500/10 active:text-red-400 active:border-red-500/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">Sign Out</span>
          </motion.button>
        )}
      </div>

      {/* ========== FULL SCREEN MODALS ========== */}

      {/* Profile Modal */}
      <FullScreenModal
        isOpen={activeModal === 'profile'}
        onClose={() => setActiveModal(null)}
        title="Profile & Branding"
        onSave={onSaveSettings}
      >
        {profile && (
          <div className="space-y-6">
            {/* Logo Upload */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-28 h-28 bg-white/[0.03] border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center overflow-hidden">
                {profile.logo ? (
                  <img src={profile.logo} alt="Logo" className="w-full h-full object-contain p-3" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Upload className="w-8 h-8" />
                    <span className="text-xs font-medium">Upload Logo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleLogoUpload}
                />
              </div>
              <p className="text-xs text-gray-500">Tap to upload your logo</p>
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
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Business Address
              </label>
              <textarea
                value={profile.address}
                onChange={(e) => onProfileChange?.({ ...profile, address: e.target.value })}
                placeholder="Enter your business address"
                rows={3}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm
                  placeholder-gray-600 focus:border-[#F6B45A]/50 focus:outline-none resize-none"
              />
            </div>
          </div>
        )}
      </FullScreenModal>

      {/* Appearance Modal */}
      <FullScreenModal
        isOpen={activeModal === 'appearance'}
        onClose={() => setActiveModal(null)}
        title="Appearance"
        onSave={onSaveSettings}
      >
        <div className="space-y-8">
          {/* Theme Toggle */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 block">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => onThemeChange?.('light')}
                className={`relative p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
                  theme === 'light'
                    ? 'border-[#F6B45A] bg-[#F6B45A]/10'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center">
                  <Sun className="w-7 h-7 text-amber-500" />
                </div>
                <span className={`text-sm font-semibold ${theme === 'light' ? 'text-[#F6B45A]' : 'text-gray-400'}`}>
                  Light
                </span>
                {theme === 'light' && (
                  <div className="absolute top-3 right-3 text-[#F6B45A]">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </button>
              <button
                onClick={() => onThemeChange?.('dark')}
                className={`relative p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
                  theme === 'dark'
                    ? 'border-[#F6B45A] bg-[#F6B45A]/10'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center">
                  <Moon className="w-7 h-7 text-blue-400" />
                </div>
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-[#F6B45A]' : 'text-gray-400'}`}>
                  Dark
                </span>
                {theme === 'dark' && (
                  <div className="absolute top-3 right-3 text-[#F6B45A]">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 block">
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
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 block">
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
          <div className="pt-2">
            <ToggleRow
              title="High Contrast"
              description="Increase visibility for better readability"
              checked={highContrast}
              onChange={(v) => onHighContrastChange?.(v)}
            />
          </div>
        </div>
      </FullScreenModal>

      {/* Notifications Modal */}
      <FullScreenModal
        isOpen={activeModal === 'notifications'}
        onClose={() => setActiveModal(null)}
        title="Notifications"
        onSave={onSaveSettings}
      >
        {notifications && (
          <div className="space-y-4">
            <ToggleRow
              icon={Mail}
              iconColor="text-blue-400"
              title="Project Updates"
              description="Get notified when project status changes"
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
              description="Receive text message updates"
              checked={notifications.smsNotifications}
              onChange={(v) => onNotificationsChange?.({ ...notifications, smsNotifications: v })}
            />
            <ToggleRow
              icon={Sparkles}
              iconColor="text-purple-400"
              title="Marketing"
              description="Product updates & special offers"
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
      </FullScreenModal>

      {/* Pricing Modal */}
      <FullScreenModal
        isOpen={activeModal === 'pricing'}
        onClose={() => setActiveModal(null)}
        title="Pricing"
        onSave={onSaveSettings}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400 mb-4">
            Set your standard unit prices for auto-generated quotes.
          </p>

          {/* Standard Pricing */}
          {pricing && pricing.map((item, index) => (
            <div key={item.id} className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[#F6B45A] uppercase bg-[#F6B45A]/10 px-3 py-1 rounded-full">
                  {item.fixtureType}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
            </div>
          ))}

          {/* Custom Pricing Items */}
          {customPricing.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Custom Items
              </p>
              {customPricing.map((item) => (
                <div key={item.id} className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 mb-3">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full">
                      Custom
                    </span>
                    <button
                      onClick={() => {
                        const updated = customPricing.filter(c => c.id !== item.id);
                        onCustomPricingChange?.(updated);
                      }}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
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
            className="w-full flex items-center justify-center gap-2 py-4 bg-white/[0.02] border-2 border-dashed border-white/10 rounded-2xl text-gray-400 active:text-white active:border-white/20 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Add Custom Fixture</span>
          </button>
        </div>
      </FullScreenModal>

      {/* Fixture Catalog Modal */}
      <FullScreenModal
        isOpen={activeModal === 'catalog'}
        onClose={() => setActiveModal(null)}
        title="Fixture Catalog"
        onSave={onSaveSettings}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400 mb-4">
            Configure your preferred brands and SKUs for the BOM.
          </p>

          {(['up', 'path', 'gutter', 'soffit', 'hardscape', 'coredrill'] as const).map((type) => {
            const item = fixtureCatalog.find(c => c.fixtureType === type) || {
              fixtureType: type, brand: '', sku: '', wattage: 4
            };
            return (
              <div key={type} className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                <span className="text-xs font-bold text-[#F6B45A] uppercase bg-[#F6B45A]/10 px-3 py-1 rounded-full mb-4 inline-block">
                  {FIXTURE_TYPE_NAMES[type] || type}
                </span>
                <div className="grid grid-cols-3 gap-2 mt-4">
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
      </FullScreenModal>

      {/* Lighting Defaults Modal */}
      <FullScreenModal
        isOpen={activeModal === 'lighting'}
        onClose={() => setActiveModal(null)}
        title="Lighting Defaults"
        onSave={onSaveSettings}
      >
        <div className="space-y-8">
          {/* Color Temperature */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 block">
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
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 block">
              Holiday Options
            </label>
            <div className="grid grid-cols-2 gap-4">
              {COLOR_TEMPERATURES.slice(4).map((temp) => (
                <button
                  key={temp.id}
                  onClick={() => onColorTempChange?.(temp.id)}
                  className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                    colorTemp === temp.id
                      ? temp.id === 'christmas'
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-purple-500 bg-purple-500/10'
                      : 'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <div className="flex gap-1.5">
                    {temp.id === 'christmas' ? (
                      <>
                        <div className="w-5 h-5 rounded-full bg-red-500" />
                        <div className="w-5 h-5 rounded-full bg-green-500" />
                      </>
                    ) : (
                      <>
                        <div className="w-5 h-5 rounded-full bg-orange-500" />
                        <div className="w-5 h-5 rounded-full bg-purple-500" />
                      </>
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">{temp.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Beam Angle */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 block">
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
          <div className="space-y-6 pt-2">
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
      </FullScreenModal>

      {/* Subscription Modal */}
      {subscription && (
        <FullScreenModal
          isOpen={activeModal === 'subscription'}
          onClose={() => setActiveModal(null)}
          title="Subscription"
        >
          <div className="space-y-6">
            {/* Plan Card */}
            <div className="bg-gradient-to-br from-[#F6B45A]/20 to-[#F6B45A]/5 rounded-2xl p-6 border border-[#F6B45A]/30">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${
                  subscription.hasActiveSubscription
                    ? 'bg-[#F6B45A] text-black'
                    : 'bg-white/20 text-white'
                }`}>
                  {subscription.hasActiveSubscription ? getPlanDisplayName(subscription.plan) : 'Free Trial'}
                </span>
                {subscription.hasActiveSubscription && (
                  <span className="text-sm text-green-400 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Active
                  </span>
                )}
              </div>

              {/* Usage */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">
                    <span className="text-white font-bold text-lg">
                      {subscription.hasActiveSubscription
                        ? subscription.generationCount
                        : subscription.freeTrialLimit - subscription.remainingFreeGenerations}
                    </span>
                    {' / '}
                    {subscription.hasActiveSubscription
                      ? subscription.monthlyLimit === -1 ? '∞' : subscription.monthlyLimit
                      : subscription.freeTrialLimit}
                    {' generations'}
                  </span>
                  {subscription.monthlyLimit === -1 && subscription.hasActiveSubscription && (
                    <span className="text-[#F6B45A] font-bold">UNLIMITED</span>
                  )}
                </div>
                <div className="h-3 bg-black/30 rounded-full overflow-hidden">
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
            </div>

            {/* Action Button */}
            {subscription.hasActiveSubscription ? (
              <button
                onClick={onManageSubscription}
                disabled={isLoadingPortal}
                className="w-full flex items-center justify-center gap-3 py-4 bg-white/10 rounded-2xl text-base font-semibold text-white disabled:opacity-50"
              >
                {isLoadingPortal ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    Manage Subscription
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onRequestUpgrade}
                className="w-full flex items-center justify-center gap-3 py-4 bg-[#F6B45A] rounded-2xl text-base font-bold text-black"
              >
                <Sparkles className="w-5 h-5" />
                Upgrade to Pro
              </button>
            )}
          </div>
        </FullScreenModal>
      )}

      {/* Help & Support Modal */}
      <FullScreenModal
        isOpen={activeModal === 'support'}
        onClose={() => setActiveModal(null)}
        title="Help & Support"
      >
        <div className="space-y-4">
          {/* AI Assistant */}
          <button
            onClick={() => {
              setActiveModal(null);
              setShowAIChat(true);
            }}
            className="w-full flex items-center gap-4 p-5 bg-gradient-to-r from-[#F6B45A]/20 to-[#F6B45A]/5 rounded-2xl border border-[#F6B45A]/30"
          >
            <div className="w-14 h-14 rounded-xl bg-[#F6B45A] flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-black" />
            </div>
            <div className="text-left flex-1">
              <p className="text-base font-bold text-white">Omnia AI Assistant</p>
              <p className="text-sm text-gray-400">Ask anything about the app</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#F6B45A]" />
          </button>

          {/* Email Support */}
          <a
            href="mailto:omniaintelligenceteam@gmail.com"
            className="w-full flex items-center gap-4 p-5 bg-white/[0.03] rounded-2xl border border-white/10"
          >
            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
              <Mail className="w-7 h-7 text-gray-400" />
            </div>
            <div className="text-left flex-1">
              <p className="text-base font-bold text-white">Email Support</p>
              <p className="text-sm text-gray-400">omniaintelligenceteam@gmail.com</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </a>
        </div>
      </FullScreenModal>

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
