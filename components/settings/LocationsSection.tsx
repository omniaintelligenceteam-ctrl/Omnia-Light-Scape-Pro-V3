import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Plus, Trash2, Edit2, Check, X, Building2, Mail, User, Loader2
} from 'lucide-react';
import { Location } from '../../types';
import { SettingsCard } from './ui/SettingsCard';
import { CardInput } from './ui/PremiumInput';
import { ToggleRow } from './ui/SettingsToggle';

interface LocationsSectionProps {
  locations: Location[];
  isLoading: boolean;
  onCreateLocation: (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Location | null>;
  onUpdateLocation: (id: string, updates: Partial<Location>) => Promise<Location | null>;
  onDeleteLocation: (id: string) => Promise<boolean>;
}

export const LocationsSection: React.FC<LocationsSectionProps> = ({
  locations,
  isLoading,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Location>>({});

  const handleStartCreate = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      address: '',
      managerName: '',
      managerEmail: '',
      isActive: true
    });
  };

  const handleStartEdit = (location: Location) => {
    setEditingId(location.id);
    setFormData({
      name: location.name,
      address: location.address,
      managerName: location.managerName,
      managerEmail: location.managerEmail,
      isActive: location.isActive
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) return;

    setIsSaving(true);
    try {
      if (isCreating) {
        await onCreateLocation({
          name: formData.name,
          address: formData.address,
          managerName: formData.managerName,
          managerEmail: formData.managerEmail,
          isActive: formData.isActive ?? true
        });
      } else if (editingId) {
        await onUpdateLocation(editingId, formData);
      }
      handleCancel();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }
    await onDeleteLocation(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#F6B45A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400 mb-6">
        Manage your business locations. Each location can have its own manager and track metrics separately.
      </p>

      {/* Location List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {locations.map((location) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {editingId === location.id ? (
                <SettingsCard className="p-5 border-[#F6B45A]/30">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase text-[#F6B45A]">Editing Location</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCancel}
                          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={isSaving || !formData.name?.trim()}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#F6B45A] text-black rounded-lg text-sm font-semibold disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <CardInput
                        label="Location Name"
                        value={formData.name || ''}
                        onChange={(v) => setFormData({ ...formData, name: v })}
                        placeholder="e.g., Austin North"
                      />
                      <CardInput
                        label="Address"
                        value={formData.address || ''}
                        onChange={(v) => setFormData({ ...formData, address: v })}
                        placeholder="123 Main St, Austin, TX"
                      />
                      <CardInput
                        label="Manager Name"
                        value={formData.managerName || ''}
                        onChange={(v) => setFormData({ ...formData, managerName: v })}
                        placeholder="John Smith"
                      />
                      <CardInput
                        label="Manager Email"
                        value={formData.managerEmail || ''}
                        onChange={(v) => setFormData({ ...formData, managerEmail: v })}
                        placeholder="john@company.com"
                        type="email"
                      />
                    </div>
                    <ToggleRow
                      title="Active Location"
                      description="Inactive locations won't appear in project dropdowns"
                      checked={formData.isActive ?? true}
                      onChange={(v) => setFormData({ ...formData, isActive: v })}
                    />
                  </div>
                </SettingsCard>
              ) : (
                <SettingsCard className="p-5 hover:border-white/10 transition-colors group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl ${location.isActive ? 'bg-[#F6B45A]/10' : 'bg-white/5'}`}>
                        <MapPin className={`w-5 h-5 ${location.isActive ? 'text-[#F6B45A]' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-white">{location.name}</h3>
                          {!location.isActive && (
                            <span className="text-[10px] px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full uppercase font-medium">
                              Inactive
                            </span>
                          )}
                        </div>
                        {location.address && (
                          <p className="text-sm text-gray-500 mt-0.5">{location.address}</p>
                        )}
                        {location.managerName && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {location.managerName}
                            </span>
                            {location.managerEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {location.managerEmail}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(location)}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(location.id)}
                        className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </SettingsCard>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Create New Location Form */}
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SettingsCard className="p-5 border-emerald-500/30">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-emerald-400">New Location</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancel}
                      className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !formData.name?.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Create
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <CardInput
                    label="Location Name"
                    value={formData.name || ''}
                    onChange={(v) => setFormData({ ...formData, name: v })}
                    placeholder="e.g., Austin North"
                  />
                  <CardInput
                    label="Address"
                    value={formData.address || ''}
                    onChange={(v) => setFormData({ ...formData, address: v })}
                    placeholder="123 Main St, Austin, TX"
                  />
                  <CardInput
                    label="Manager Name"
                    value={formData.managerName || ''}
                    onChange={(v) => setFormData({ ...formData, managerName: v })}
                    placeholder="John Smith"
                  />
                  <CardInput
                    label="Manager Email"
                    value={formData.managerEmail || ''}
                    onChange={(v) => setFormData({ ...formData, managerEmail: v })}
                    placeholder="john@company.com"
                    type="email"
                  />
                </div>
              </div>
            </SettingsCard>
          </motion.div>
        )}
      </div>

      {/* Add Location Button */}
      {!isCreating && (
        <button
          onClick={handleStartCreate}
          className="w-full flex items-center justify-center gap-2 py-4 bg-white/[0.02] border border-dashed border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/[0.03] transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Location</span>
        </button>
      )}

      {/* Empty State */}
      {locations.length === 0 && !isCreating && (
        <div className="text-center py-8">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Locations Yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Add your business locations to track performance across multiple sites.
          </p>
        </div>
      )}
    </div>
  );
};
