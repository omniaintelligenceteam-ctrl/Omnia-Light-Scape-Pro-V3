import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Palette, Bell, DollarSign, Package, Lightbulb, CreditCard,
  HelpCircle, LogOut, Save, Loader2, Upload, Check, Moon,
  Mail, MessageCircle, Sparkles, Volume2, VolumeX, ExternalLink, Plus, Trash2, Phone,
  X, ChevronRight, Download, FileJson, Clock, Target, MapPin, Users, UserPlus
} from 'lucide-react';
import { useSuccessToast, useErrorToast } from '../Toast';
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
import { InventoryView } from '../InventoryView';

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
          <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
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
  selectedLocationId = null,
  onLocationChange,
  technicians = [],
  techniciansLoading = false,
  onCreateTechnician,
  onUpdateTechnician,
  onDeleteTechnician
}) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const { isOwner, isAdmin } = useOrganization();

  // Toast notifications
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  // Form validation state
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

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
      <div className="px-4 py-4 space-y-3 pb-52" style={{ paddingBottom: 'max(13rem, calc(10rem + env(safe-area-inset-bottom, 0px)))' }}>

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

        {/* Inventory */}
        <MenuButton
          icon={Package}
          title="Inventory"
          description="Stock levels & materials"
          onClick={() => setActiveModal('inventory')}
        />

        {/* Lighting Defaults */}
        <MenuButton
          icon={Lightbulb}
          title="Lighting Defaults"
          description="Color temp & beam angle"
          onClick={() => setActiveModal('lighting')}
        />

        {/* Follow-ups */}
        <MenuButton
          icon={Clock}
          title="Follow-ups"
          description="Automated reminders"
          onClick={() => setActiveModal('followups')}
        />

        {/* Goals */}
        <MenuButton
          icon={Target}
          title="Business Goals"
          description="Revenue & project targets"
          onClick={() => setActiveModal('goals')}
        />

        {/* Locations */}
        <MenuButton
          icon={MapPin}
          title="Locations"
          description={`${locations.length} location${locations.length !== 1 ? 's' : ''}`}
          onClick={() => setActiveModal('locations')}
        />

        {/* Technicians */}
        <MenuButton
          icon={Users}
          title="Technicians"
          description={`${technicians.length} technician${technicians.length !== 1 ? 's' : ''}`}
          onClick={() => setActiveModal('technicians')}
        />

        {/* Team (Owner only) */}
        {isOwner && (
          <MenuButton
            icon={UserPlus}
            title="Team"
            description="Manage team members & invites"
            onClick={() => setActiveModal('team')}
          />
        )}

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
            <div>
              <CardInput
                label="Email"
                value={profile.email}
                onChange={(v) => {
                  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v === '';
                  setEmailError(isValid ? '' : 'Invalid email format');
                  onProfileChange?.({ ...profile, email: v });
                }}
                placeholder="contact@company.com"
                type="email"
              />
              {emailError && <p className="text-xs text-red-400 mt-1">{emailError}</p>}
            </div>
            <div>
              <CardInput
                label="Phone Number"
                value={profile.phone || ''}
                onChange={(v) => {
                  const cleaned = v.replace(/\D/g, '');
                  setPhoneError(cleaned.length >= 10 || v === '' ? '' : 'Phone number too short');
                  onProfileChange?.({ ...profile, phone: v });
                }}
                placeholder="(555) 123-4567"
                type="tel"
              />
              {phoneError && <p className="text-xs text-red-400 mt-1">{phoneError}</p>}
            </div>
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
          {/* Theme - Dark Mode Only */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 block">
              Theme
            </label>
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
              <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center">
                <Moon className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white">Dark Mode</span>
                <p className="text-xs text-gray-500">Optimized for professional use</p>
              </div>
              <div className="ml-auto text-[#F6B45A]">
                <Check className="w-5 h-5" />
              </div>
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
          {customPricing.length === 0 && (
            <div className="text-center py-6 border border-dashed border-white/10 rounded-xl mt-4">
              <DollarSign className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">No Custom Pricing</h3>
              <p className="text-xs text-gray-500">Add custom fixtures with your own pricing below.</p>
            </div>
          )}
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
                        if (!confirm('Delete this custom pricing item? This cannot be undone.')) return;
                        const updated = customPricing.filter(c => c.id !== item.id);
                        onCustomPricingChange?.(updated);
                        successToast('Pricing item deleted');
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

          {/* Standard Fixture Types */}
          {(['up', 'path', 'gutter', 'soffit', 'hardscape', 'coredrill', 'well', 'holiday'] as const).map((type) => {
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

          {/* Custom SKU Entries */}
          {fixtureCatalog.filter(c => c.fixtureType === 'custom').length === 0 && (
            <div className="text-center py-6 border border-dashed border-white/10 rounded-xl mt-4">
              <Package className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">No Custom SKUs</h3>
              <p className="text-xs text-gray-500">Add custom fixture entries below.</p>
            </div>
          )}
          {fixtureCatalog
            .filter(c => c.fixtureType === 'custom')
            .map((item) => (
              <div key={item.id} className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full">
                    Custom SKU
                  </span>
                  <button
                    onClick={() => {
                      if (!confirm('Delete this fixture entry? This cannot be undone.')) return;
                      const updated = fixtureCatalog.filter(c => c.id !== item.id);
                      onFixtureCatalogChange?.(updated);
                      successToast('Fixture entry deleted');
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <CardInput
                    label="Name"
                    value={item.customName || ''}
                    onChange={(v) => {
                      const updated = fixtureCatalog.map(c =>
                        c.id === item.id ? { ...c, customName: v } : c
                      );
                      onFixtureCatalogChange?.(updated);
                    }}
                    placeholder="Fixture name"
                  />
                  <CardInput
                    label="Brand"
                    value={item.brand}
                    onChange={(v) => {
                      const updated = fixtureCatalog.map(c =>
                        c.id === item.id ? { ...c, brand: v } : c
                      );
                      onFixtureCatalogChange?.(updated);
                    }}
                    placeholder="Brand"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <CardInput
                    label="SKU"
                    value={item.sku}
                    onChange={(v) => {
                      const updated = fixtureCatalog.map(c =>
                        c.id === item.id ? { ...c, sku: v } : c
                      );
                      onFixtureCatalogChange?.(updated);
                    }}
                    placeholder="SKU"
                  />
                  <CardInput
                    label="Watts"
                    value={item.wattage}
                    onChange={(v) => {
                      const updated = fixtureCatalog.map(c =>
                        c.id === item.id ? { ...c, wattage: parseInt(v) || 0 } : c
                      );
                      onFixtureCatalogChange?.(updated);
                    }}
                    type="number"
                    suffix="W"
                  />
                </div>
              </div>
            ))}

          {/* Add SKU Button */}
          <button
            onClick={() => {
              const newItem = {
                id: `custom-sku-${Date.now()}`,
                fixtureType: 'custom' as const,
                customName: '',
                brand: '',
                sku: '',
                wattage: 4
              };
              onFixtureCatalogChange?.([...fixtureCatalog, newItem]);
            }}
            className="w-full flex items-center justify-center gap-2 py-4 bg-white/[0.02] border border-dashed border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/[0.03] transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add SKU</span>
          </button>
        </div>
      </FullScreenModal>

      {/* Inventory Modal */}
      <FullScreenModal
        isOpen={activeModal === 'inventory'}
        onClose={() => setActiveModal(null)}
        title="Inventory"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400 mb-4">
            Manage your fixture inventory and stock levels.
          </p>
          <InventoryView />
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

      {/* Follow-ups Modal */}
      <FullScreenModal
        isOpen={activeModal === 'followups'}
        onClose={() => setActiveModal(null)}
        title="Follow-ups"
        onSave={onSaveSettings}
      >
        <div className="space-y-6">
          {/* Quote Reminders */}
          <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 space-y-4">
            <h3 className="text-base font-semibold text-white">Quote Reminders</h3>
            <ToggleRow
              title="Enable quote reminders"
              description="Auto-remind clients about pending quotes"
              checked={followUpSettings?.enableQuoteReminders ?? true}
              onChange={(checked) => onFollowUpSettingsChange?.({
                ...followUpSettings!,
                enableQuoteReminders: checked
              })}
            />
            {followUpSettings?.enableQuoteReminders !== false && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Reminder after</span>
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
                      className="w-14 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-center text-sm"
                    />
                    <span className="text-sm text-gray-400">days</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Expiry warning</span>
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
                      className="w-14 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-center text-sm"
                    />
                    <span className="text-sm text-gray-400">days</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Invoice Reminders */}
          <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 space-y-4">
            <h3 className="text-base font-semibold text-white">Invoice Reminders</h3>
            <ToggleRow
              title="Enable invoice reminders"
              description="Auto-remind about unpaid invoices"
              checked={followUpSettings?.enableInvoiceReminders ?? true}
              onChange={(checked) => onFollowUpSettingsChange?.({
                ...followUpSettings!,
                enableInvoiceReminders: checked
              })}
            />
            {followUpSettings?.enableInvoiceReminders !== false && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Payment reminder</span>
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
                      className="w-14 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-center text-sm"
                    />
                    <span className="text-sm text-gray-400">days</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Overdue notice</span>
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
                      className="w-14 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-center text-sm"
                    />
                    <span className="text-sm text-gray-400">days</span>
                  </div>
                </div>
                <ToggleRow
                  title="SMS for overdue"
                  description="Send SMS for overdue payments"
                  checked={followUpSettings?.enableSmsForOverdue ?? false}
                  onChange={(checked) => onFollowUpSettingsChange?.({
                    ...followUpSettings!,
                    enableSmsForOverdue: checked
                  })}
                />
              </>
            )}
          </div>

          {/* Installation Reminders */}
          <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 space-y-4">
            <h3 className="text-base font-semibold text-white">Installation Reminders</h3>
            <ToggleRow
              title="Pre-installation reminders"
              description="Remind clients before installation"
              checked={followUpSettings?.enablePreInstallReminders ?? true}
              onChange={(checked) => onFollowUpSettingsChange?.({
                ...followUpSettings!,
                enablePreInstallReminders: checked
              })}
            />
            {followUpSettings?.enablePreInstallReminders !== false && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Remind before</span>
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
                    className="w-14 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-center text-sm"
                  />
                  <span className="text-sm text-gray-400">days</span>
                </div>
              </div>
            )}
          </div>

          {/* Review Requests */}
          <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 space-y-4">
            <h3 className="text-base font-semibold text-white">Review Requests</h3>
            <ToggleRow
              title="Enable review requests"
              description="Request Google reviews after completion"
              checked={followUpSettings?.enableReviewRequests ?? true}
              onChange={(checked) => onFollowUpSettingsChange?.({
                ...followUpSettings!,
                enableReviewRequests: checked
              })}
            />
            {followUpSettings?.enableReviewRequests !== false && (
              <>
                <div>
                  <span className="text-sm text-gray-300 block mb-2">Google Review URL</span>
                  <input
                    type="url"
                    placeholder="https://g.page/r/your-business/review"
                    value={followUpSettings?.googleReviewUrl ?? ''}
                    onChange={(e) => onFollowUpSettingsChange?.({
                      ...followUpSettings!,
                      googleReviewUrl: e.target.value
                    })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Send after</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={followUpSettings?.reviewRequestDays ?? 7}
                      onChange={(e) => onFollowUpSettingsChange?.({
                        ...followUpSettings!,
                        reviewRequestDays: parseInt(e.target.value) || 7
                      })}
                      className="w-14 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-center text-sm"
                    />
                    <span className="text-sm text-gray-400">days</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </FullScreenModal>

      {/* Goals Modal */}
      <FullScreenModal
        isOpen={activeModal === 'goals'}
        onClose={() => setActiveModal(null)}
        title="Business Goals"
        onSave={onSaveSettings}
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-400">
            Set targets to track your business performance in the analytics dashboard.
          </p>

          {/* Monthly Revenue Goal */}
          <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Monthly Revenue</h3>
                <p className="text-xs text-gray-500">Target for {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">$</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={businessGoals?.find(g => g.goalType === 'revenue' && g.periodType === 'monthly' && g.month === new Date().getMonth() + 1 && g.year === new Date().getFullYear())?.targetValue || ''}
                onChange={(e) => onBusinessGoalChange?.({
                  goalType: 'revenue',
                  periodType: 'monthly',
                  targetValue: parseFloat(e.target.value) || 0,
                  year: new Date().getFullYear(),
                  month: new Date().getMonth() + 1
                })}
                placeholder="15000"
                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Yearly Revenue Goal */}
          <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Yearly Revenue</h3>
                <p className="text-xs text-gray-500">Target for {new Date().getFullYear()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">$</span>
              <input
                type="number"
                min={0}
                step={10000}
                value={businessGoals?.find(g => g.goalType === 'revenue' && g.periodType === 'yearly' && g.year === new Date().getFullYear())?.targetValue || ''}
                onChange={(e) => onBusinessGoalChange?.({
                  goalType: 'revenue',
                  periodType: 'yearly',
                  targetValue: parseFloat(e.target.value) || 0,
                  year: new Date().getFullYear()
                })}
                placeholder="180000"
                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Monthly Projects Goal */}
          <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Projects Completed</h3>
                <p className="text-xs text-gray-500">Monthly target for {new Date().toLocaleString('default', { month: 'long' })}</p>
              </div>
            </div>
            <input
              type="number"
              min={0}
              step={1}
              value={businessGoals?.find(g => g.goalType === 'projects_completed' && g.periodType === 'monthly' && g.month === new Date().getMonth() + 1 && g.year === new Date().getFullYear())?.targetValue || ''}
              onChange={(e) => onBusinessGoalChange?.({
                goalType: 'projects_completed',
                periodType: 'monthly',
                targetValue: parseInt(e.target.value) || 0,
                year: new Date().getFullYear(),
                month: new Date().getMonth() + 1
              })}
              placeholder="10"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
            />
          </div>

          {/* Monthly New Clients Goal */}
          <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <User className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">New Clients</h3>
                <p className="text-xs text-gray-500">Monthly target for {new Date().toLocaleString('default', { month: 'long' })}</p>
              </div>
            </div>
            <input
              type="number"
              min={0}
              step={1}
              value={businessGoals?.find(g => g.goalType === 'new_clients' && g.periodType === 'monthly' && g.month === new Date().getMonth() + 1 && g.year === new Date().getFullYear())?.targetValue || ''}
              onChange={(e) => onBusinessGoalChange?.({
                goalType: 'new_clients',
                periodType: 'monthly',
                targetValue: parseInt(e.target.value) || 0,
                year: new Date().getFullYear(),
                month: new Date().getMonth() + 1
              })}
              placeholder="5"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
        </div>
      </FullScreenModal>

      {/* Locations Modal */}
      {onCreateLocation && onUpdateLocation && onDeleteLocation && (
        <FullScreenModal
          isOpen={activeModal === 'locations'}
          onClose={() => setActiveModal(null)}
          title="Locations"
        >
          <LocationsSection
            locations={locations}
            isLoading={locationsLoading}
            onCreateLocation={onCreateLocation}
            onUpdateLocation={onUpdateLocation}
            onDeleteLocation={onDeleteLocation}
            selectedLocationId={selectedLocationId}
            onLocationChange={onLocationChange!}
          />
        </FullScreenModal>
      )}

      {/* Technicians Modal */}
      {onCreateTechnician && onUpdateTechnician && onDeleteTechnician && (
        <FullScreenModal
          isOpen={activeModal === 'technicians'}
          onClose={() => setActiveModal(null)}
          title="Technicians"
        >
          <TechniciansSection
            technicians={technicians}
            locations={locations}
            isLoading={techniciansLoading}
            onCreateTechnician={onCreateTechnician}
            onUpdateTechnician={onUpdateTechnician}
            onDeleteTechnician={onDeleteTechnician}
          />
        </FullScreenModal>
      )}

      {/* Team Modal (Owner only) */}
      {isOwner && (
        <FullScreenModal
          isOpen={activeModal === 'team'}
          onClose={() => setActiveModal(null)}
          title="Team"
        >
          <TeamSection isOwner={isOwner} isAdmin={isAdmin} />
        </FullScreenModal>
      )}

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

          {/* Backup & Restore */}
          <div className="w-full p-5 bg-white/[0.03] rounded-2xl border border-white/10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <FileJson className="w-7 h-7 text-cyan-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-base font-bold text-white">Backup & Restore</p>
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
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 active:bg-cyan-500/20 text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 active:bg-purple-500/20 text-sm font-semibold cursor-pointer">
                <Upload className="w-4 h-4" />
                Import
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
                  }}
                />
              </label>
            </div>
          </div>
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
