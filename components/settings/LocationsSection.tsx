import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Plus, Trash2, Edit2, Check, X, Building2, Mail, User, Loader2, Search,
  TrendingUp, TrendingDown, DollarSign, Briefcase, Target, BarChart3, ChevronDown, ChevronUp, Globe
} from 'lucide-react';
import { Location, LocationMetrics } from '../../types';
import { SettingsCard } from './ui/SettingsCard';
import { CardInput } from './ui/PremiumInput';
import { ToggleRow } from './ui/SettingsToggle';
import { LocationSwitcher } from '../LocationSwitcher';

interface LocationsSectionProps {
  locations: Location[];
  locationMetrics?: LocationMetrics[];
  isLoading: boolean;
  onCreateLocation: (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Location | null>;
  onUpdateLocation: (id: string, updates: Partial<Location>) => Promise<Location | null>;
  onDeleteLocation: (id: string) => Promise<boolean>;
  // Location switcher props
  selectedLocationId: string | null;
  onLocationChange: (locationId: string | null) => void;
}

export const LocationsSection: React.FC<LocationsSectionProps> = ({
  locations,
  locationMetrics,
  isLoading,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
  selectedLocationId,
  onLocationChange
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Location>>({});

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'date-desc' | 'date-asc'>('name-asc');

  // Metrics visibility state
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());

  const toggleMetrics = (locationId: string) => {
    setExpandedMetrics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

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

  // Filtered and Sorted Locations
  const filteredAndSortedLocations = useMemo(() => {
    let filtered = locations || [];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(loc =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.managerName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter === 'active') filtered = filtered.filter(loc => loc.isActive);
    if (statusFilter === 'inactive') filtered = filtered.filter(loc => !loc.isActive);

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'date-desc': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date-asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default: return 0;
      }
    });
  }, [locations, searchQuery, statusFilter, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#F6B45A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Location Switcher */}
      {locations.filter(loc => loc.isActive).length > 0 && (
        <SettingsCard className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F6B45A]/10">
                <Globe className="w-5 h-5 text-[#F6B45A]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Active Location Filter</h3>
                <p className="text-xs text-gray-500">Switch between locations to filter all data</p>
              </div>
            </div>
            <LocationSwitcher
              locations={locations}
              selectedLocationId={selectedLocationId}
              onLocationChange={onLocationChange}
              isLoading={isLoading}
            />
          </div>
        </SettingsCard>
      )}

      <p className="text-sm text-gray-400 mb-6">
        Manage your business locations. Each location can have its own manager and track metrics separately.
      </p>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
        >
          <option value="all" className="bg-[#1a1a1a] text-white">All Locations</option>
          <option value="active" className="bg-[#1a1a1a] text-white">Active Only</option>
          <option value="inactive" className="bg-[#1a1a1a] text-white">Inactive Only</option>
        </select>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
        >
          <option value="name-asc" className="bg-[#1a1a1a] text-white">Name (A-Z)</option>
          <option value="name-desc" className="bg-[#1a1a1a] text-white">Name (Z-A)</option>
          <option value="date-desc" className="bg-[#1a1a1a] text-white">Newest First</option>
          <option value="date-asc" className="bg-[#1a1a1a] text-white">Oldest First</option>
        </select>
      </div>

      {/* Results Count */}
      {(searchQuery || statusFilter !== 'all') && (
        <p className="text-sm text-gray-400 mb-3">
          Showing {filteredAndSortedLocations.length} of {locations?.length || 0} locations
        </p>
      )}

      {/* Location List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredAndSortedLocations.map((location) => (
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
                  <div className="space-y-3">
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

                    {/* Performance Metrics Toggle */}
                    {locationMetrics && locationMetrics.find(m => m.locationId === location.id) && (
                      <>
                        <button
                          onClick={() => toggleMetrics(location.id)}
                          className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>{expandedMetrics.has(location.id) ? 'Hide' : 'Show'} Performance Metrics</span>
                          {expandedMetrics.has(location.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {/* Metrics Section */}
                        <AnimatePresence>
                          {expandedMetrics.has(location.id) && (() => {
                            const metrics = locationMetrics.find(m => m.locationId === location.id);
                            if (!metrics) return null;

                            return (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5"
                              >
                                {/* Revenue */}
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <DollarSign className="w-3 h-3 text-[#F6B45A]" />
                                    <p className="text-[10px] text-gray-500">Revenue</p>
                                  </div>
                                  <p className="text-base font-bold text-white">${(metrics.revenue / 1000).toFixed(1)}k</p>
                                  {metrics.trend !== 0 && (
                                    <div className={`flex items-center gap-0.5 text-[10px] ${metrics.trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {metrics.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                      <span>{Math.abs(metrics.trend)}%</span>
                                    </div>
                                  )}
                                </div>

                                {/* Jobs Completed */}
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Briefcase className="w-3 h-3 text-emerald-400" />
                                    <p className="text-[10px] text-gray-500">Completed</p>
                                  </div>
                                  <p className="text-base font-bold text-emerald-400">{metrics.jobsCompleted}</p>
                                  <p className="text-[10px] text-gray-600">projects</p>
                                </div>

                                {/* Active Projects */}
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Target className="w-3 h-3 text-blue-400" />
                                    <p className="text-[10px] text-gray-500">Active</p>
                                  </div>
                                  <p className="text-base font-bold text-blue-400">{metrics.activeProjects}</p>
                                  <p className="text-[10px] text-gray-600">projects</p>
                                </div>

                                {/* Avg Ticket */}
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <DollarSign className="w-3 h-3 text-purple-400" />
                                    <p className="text-[10px] text-gray-500">Avg Ticket</p>
                                  </div>
                                  <p className="text-base font-bold text-purple-400">${(metrics.avgTicket / 1000).toFixed(1)}k</p>
                                  <p className="text-[10px] text-gray-600">per job</p>
                                </div>

                                {/* Conversion Rate */}
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <TrendingUp className="w-3 h-3 text-green-400" />
                                    <p className="text-[10px] text-gray-500">Conversion</p>
                                  </div>
                                  <p className="text-base font-bold text-green-400">{metrics.conversionRate}%</p>
                                  <p className="text-[10px] text-gray-600">quote → job</p>
                                </div>
                              </motion.div>
                            );
                          })()}
                        </AnimatePresence>
                      </>
                    )}
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
      {(locations || []).length === 0 && !isCreating && (
        <div className="text-center py-8">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Locations Yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Add your business locations to track performance across multiple sites.
          </p>
        </div>
      )}

      {/* No Results State */}
      {(locations || []).length > 0 && filteredAndSortedLocations.length === 0 && !isCreating && (
        <div className="text-center py-8">
          <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Locations Found</h3>
          <p className="text-sm text-gray-500 mb-4">
            Try adjusting your search or filter criteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="text-sm text-[#F6B45A] hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};
