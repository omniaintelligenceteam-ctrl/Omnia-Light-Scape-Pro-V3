import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Plus, Trash2 } from 'lucide-react';
import { useSuccessToast } from '../../Toast';
import { SettingsCard } from '../ui/SettingsCard';
import { CardInput } from '../ui/PremiumInput';
import { FixturePricing, CustomPricingItem } from '../../../types';

interface PricingSectionProps {
  pricing: FixturePricing[];
  onPricingChange?: (pricing: FixturePricing[]) => void;
  customPricing?: CustomPricingItem[];
  onCustomPricingChange?: (items: CustomPricingItem[]) => void;
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const PricingSection: React.FC<PricingSectionProps> = ({
  pricing,
  onPricingChange,
  customPricing = [],
  onCustomPricingChange
}) => {
  const successToast = useSuccessToast();

  return (
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
        {customPricing.length === 0 && (
          <div className="text-center py-8 border border-dashed border-white/10 rounded-xl col-span-2">
            <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">No Custom Pricing</h3>
            <p className="text-sm text-gray-500">Add custom fixtures with your own pricing below.</p>
          </div>
        )}
        {customPricing.map((item) => (
          <SettingsCard key={item.id} className="p-5 hover:border-white/10 transition-colors relative group">
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[10px] font-bold uppercase bg-emerald-500 text-black px-2.5 py-1 rounded-full">
                Custom
              </span>
              <button
                onClick={() => {
                  if (!confirm('Delete this custom pricing item? This cannot be undone.')) return;
                  const updated = customPricing.filter(c => c.id !== item.id);
                  onCustomPricingChange?.(updated);
                  successToast('Pricing item deleted');
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
  );
};
