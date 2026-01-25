import React from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Trash2 } from 'lucide-react';
import { useSuccessToast } from '../../Toast';
import { SettingsCard } from '../ui/SettingsCard';
import { CardInput } from '../ui/PremiumInput';
import { FIXTURE_TYPE_NAMES } from '../../../constants';
import { FixtureCatalogItem } from '../../../types';

interface CatalogSectionProps {
  fixtureCatalog?: FixtureCatalogItem[];
  onFixtureCatalogChange?: (catalog: FixtureCatalogItem[]) => void;
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  fixtureCatalog = [],
  onFixtureCatalogChange
}) => {
  const successToast = useSuccessToast();

  return (
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
        {/* Standard Fixture Types */}
        {(['up', 'path', 'gutter', 'soffit', 'hardscape', 'coredrill', 'well', 'holiday'] as const).map((type) => {
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

        {/* Custom SKU Entries */}
        {fixtureCatalog.filter(c => c.fixtureType === 'custom').length === 0 && (
          <div className="text-center py-6 border border-dashed border-white/10 rounded-xl col-span-3 mt-4">
            <Package className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white mb-1">No Custom SKUs</h3>
            <p className="text-xs text-gray-500">Add custom fixture entries below.</p>
          </div>
        )}
        {fixtureCatalog
          .filter(c => c.fixtureType === 'custom')
          .map((item) => (
            <SettingsCard key={item.id} className="p-5 hover:border-white/10 transition-colors relative group">
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-[10px] font-bold uppercase bg-emerald-500 text-black px-2.5 py-1 rounded-full">
                  Custom SKU
                </span>
                <button
                  onClick={() => {
                    if (!confirm('Delete this fixture entry? This cannot be undone.')) return;
                    const updated = fixtureCatalog.filter(c => c.id !== item.id);
                    onFixtureCatalogChange?.(updated);
                    successToast('Fixture entry deleted');
                  }}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <CardInput
                  label="Fixture Name"
                  value={item.customName || ''}
                  onChange={(v) => {
                    const updated = fixtureCatalog.map(c =>
                      c.id === item.id ? { ...c, customName: v } : c
                    );
                    onFixtureCatalogChange?.(updated);
                  }}
                  placeholder="e.g., Well Light"
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
                  placeholder="e.g., WAC"
                />
                <CardInput
                  label="SKU / Model"
                  value={item.sku}
                  onChange={(v) => {
                    const updated = fixtureCatalog.map(c =>
                      c.id === item.id ? { ...c, sku: v } : c
                    );
                    onFixtureCatalogChange?.(updated);
                  }}
                  placeholder="e.g., 5111-30"
                />
                <CardInput
                  label="Wattage"
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
            </SettingsCard>
          ))}
      </div>

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
    </motion.div>
  );
};
