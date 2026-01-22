import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Trash2, Edit2, Check, X, Mail, Phone, MapPin, Loader2, Award, Search,
  TrendingUp, DollarSign, Briefcase, Clock, Target, ChevronDown, ChevronUp, Wrench,
  BadgeCheck, FileText, Calendar
} from 'lucide-react';
import { Technician, TechnicianRole, Location, TechnicianMetrics, TechnicianCertification } from '../../types';
import { SettingsCard } from './ui/SettingsCard';
import { CardInput } from './ui/PremiumInput';
import { ToggleRow } from './ui/SettingsToggle';
import { ChipSelect } from './ui/SegmentedControl';

interface TechniciansSectionProps {
  technicians: Technician[];
  technicianMetrics?: TechnicianMetrics[];
  locations: Location[];
  isLoading: boolean;
  onCreateTechnician: (technician: Omit<Technician, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Technician | null>;
  onUpdateTechnician: (id: string, updates: Partial<Technician>) => Promise<Technician | null>;
  onDeleteTechnician: (id: string) => Promise<boolean>;
}

const roleLabels: Record<TechnicianRole, string> = {
  lead: 'Lead',
  technician: 'Technician',
  apprentice: 'Apprentice'
};

const roleColors: Record<TechnicianRole, string> = {
  lead: 'bg-[#F6B45A]/20 text-[#F6B45A]',
  technician: 'bg-blue-500/20 text-blue-400',
  apprentice: 'bg-emerald-500/20 text-emerald-400'
};

const COMMON_SKILLS = [
  'LED Installation',
  'Path Lighting',
  'Uplighting',
  'Hardscape Lighting',
  'Tree Lighting',
  'Irrigation Systems',
  'Low Voltage Wiring',
  'Lighting Design',
  'Troubleshooting',
  'Maintenance'
];

export const TechniciansSection: React.FC<TechniciansSectionProps> = ({
  technicians,
  technicianMetrics,
  locations,
  isLoading,
  onCreateTechnician,
  onUpdateTechnician,
  onDeleteTechnician
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Technician>>({});

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | TechnicianRole>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'unassigned' | string>('all');
  const [skillsFilter, setSkillsFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'location' | 'date'>('name');

  // Metrics visibility state
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());

  // Skills input state
  const [newSkill, setNewSkill] = useState('');

  // Certification modal state
  const [showCertModal, setShowCertModal] = useState(false);
  const [newCert, setNewCert] = useState<Partial<TechnicianCertification>>({
    name: '',
    issuedBy: '',
    issueDate: '',
    expiryDate: ''
  });

  // Unique skills across all technicians for filter dropdown
  const uniqueSkills = useMemo(() => {
    const allSkills = technicians?.flatMap(t => t.skills || []) || [];
    return Array.from(new Set(allSkills)).sort();
  }, [technicians]);

  const toggleMetrics = (techId: string) => {
    setExpandedMetrics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(techId)) {
        newSet.delete(techId);
      } else {
        newSet.add(techId);
      }
      return newSet;
    });
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      email: '',
      phone: '',
      locationId: locations[0]?.id,
      role: 'technician',
      isActive: true,
      skills: [],
      certifications: [],
      notes: ''
    });
  };

  const handleStartEdit = (technician: Technician) => {
    setEditingId(technician.id);
    setFormData({
      name: technician.name,
      email: technician.email,
      phone: technician.phone,
      locationId: technician.locationId,
      role: technician.role,
      isActive: technician.isActive,
      skills: technician.skills || [],
      certifications: technician.certifications || [],
      notes: technician.notes
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
        await onCreateTechnician({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          locationId: formData.locationId,
          role: formData.role || 'technician',
          isActive: formData.isActive ?? true,
          skills: formData.skills,
          certifications: formData.certifications,
          notes: formData.notes
        });
      } else if (editingId) {
        await onUpdateTechnician(editingId, formData);
      }
      handleCancel();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this technician? This action cannot be undone.')) {
      return;
    }
    await onDeleteTechnician(id);
  };

  // Skills management
  const addSkill = () => {
    if (newSkill.trim() && formData) {
      const skills = [...(formData.skills || [])];
      if (!skills.includes(newSkill.trim())) {
        skills.push(newSkill.trim());
        setFormData({ ...formData, skills });
      }
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    if (formData) {
      const skills = (formData.skills || []).filter(s => s !== skillToRemove);
      setFormData({ ...formData, skills });
    }
  };

  const quickAddSkill = (skill: string) => {
    if (formData && !formData.skills?.includes(skill)) {
      const skills = [...(formData.skills || []), skill];
      setFormData({ ...formData, skills });
    }
  };

  // Certifications management
  const addCertification = () => {
    if (newCert.name?.trim() && newCert.issueDate && formData) {
      const cert: TechnicianCertification = {
        id: crypto.randomUUID(),
        name: newCert.name.trim(),
        issuedBy: newCert.issuedBy?.trim(),
        issueDate: newCert.issueDate,
        expiryDate: newCert.expiryDate || undefined
      };
      const certifications = [...(formData.certifications || []), cert];
      setFormData({ ...formData, certifications });
      setNewCert({ name: '', issuedBy: '', issueDate: '', expiryDate: '' });
      setShowCertModal(false);
    }
  };

  const removeCertification = (certId: string) => {
    if (formData) {
      const certifications = (formData.certifications || []).filter(c => c.id !== certId);
      setFormData({ ...formData, certifications });
    }
  };

  // Filtered and Sorted Technicians
  const filteredAndSortedTechnicians = useMemo(() => {
    let filtered = technicians || [];

    // Search (now includes skills)
    if (searchQuery) {
      filtered = filtered.filter(tech =>
        tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tech.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tech.phone?.includes(searchQuery) ||
        tech.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter === 'active') filtered = filtered.filter(t => t.isActive);
    if (statusFilter === 'inactive') filtered = filtered.filter(t => !t.isActive);

    // Role filter
    if (roleFilter !== 'all') filtered = filtered.filter(t => t.role === roleFilter);

    // Location filter
    if (locationFilter !== 'all') {
      if (locationFilter === 'unassigned') {
        filtered = filtered.filter(t => !t.locationId);
      } else {
        filtered = filtered.filter(t => t.locationId === locationFilter);
      }
    }

    // Skills filter
    if (skillsFilter !== 'all') {
      filtered = filtered.filter(t => t.skills?.includes(skillsFilter));
    }

    // Sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'role': return a.role.localeCompare(b.role);
        case 'location': {
          const locA = locations?.find(l => l.id === a.locationId)?.name || 'Unassigned';
          const locB = locations?.find(l => l.id === b.locationId)?.name || 'Unassigned';
          return locA.localeCompare(locB);
        }
        case 'date': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default: return 0;
      }
    });
  }, [technicians, searchQuery, statusFilter, roleFilter, locationFilter, skillsFilter, sortBy, locations]);

  // Group filtered technicians by location
  const techniciansByLocation = filteredAndSortedTechnicians.reduce((acc, tech) => {
    const locId = tech.locationId || 'unassigned';
    if (!acc[locId]) acc[locId] = [];
    acc[locId].push(tech);
    return acc;
  }, {} as Record<string, Technician[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#F6B45A] animate-spin" />
      </div>
    );
  }

  const renderForm = (isNew: boolean) => (
    <SettingsCard className={`p-5 ${isNew ? 'border-emerald-500/30' : 'border-[#F6B45A]/30'}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-bold uppercase ${isNew ? 'text-emerald-400' : 'text-[#F6B45A]'}`}>
            {isNew ? 'New Technician' : 'Editing Technician'}
          </span>
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
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${
                isNew ? 'bg-emerald-500 text-white' : 'bg-[#F6B45A] text-black'
              }`}
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <CardInput
            label="Name"
            value={formData.name || ''}
            onChange={(v) => setFormData({ ...formData, name: v })}
            placeholder="John Smith"
          />
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
              Location
            </label>
            <select
              value={formData.locationId || ''}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value || undefined })}
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-white text-sm
                focus:border-[#F6B45A]/50 focus:outline-none transition-colors"
            >
              <option value="" className="bg-[#1a1a1a]">Unassigned</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id} className="bg-[#1a1a1a]">
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          <CardInput
            label="Email"
            value={formData.email || ''}
            onChange={(v) => setFormData({ ...formData, email: v })}
            placeholder="john@company.com"
            type="email"
          />
          <CardInput
            label="Phone"
            value={formData.phone || ''}
            onChange={(v) => setFormData({ ...formData, phone: v })}
            placeholder="(555) 123-4567"
            type="tel"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
            Role
          </label>
          <ChipSelect
            options={[
              { value: 'lead', label: 'Lead', sublabel: 'Senior technician' },
              { value: 'technician', label: 'Technician', sublabel: 'Standard role' },
              { value: 'apprentice', label: 'Apprentice', sublabel: 'In training' }
            ]}
            value={formData.role || 'technician'}
            onChange={(v) => setFormData({ ...formData, role: v as TechnicianRole })}
            columns={3}
          />
        </div>

        <ToggleRow
          title="Active Technician"
          description="Inactive technicians won't appear in assignment dropdowns"
          checked={formData.isActive ?? true}
          onChange={(v) => setFormData({ ...formData, isActive: v })}
        />

        {/* Skills Section */}
        <div className="pt-4 border-t border-white/5">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-3">
            <Wrench className="w-3 h-3 inline-block mr-1" />
            Skills & Expertise
          </label>

          {/* Current Skills */}
          {(formData.skills?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.skills?.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full"
                >
                  <span className="text-xs text-blue-400">{skill}</span>
                  <button
                    onClick={() => removeSkill(skill)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Skill Input */}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Add a skill (e.g., LED Installation)"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm
                focus:border-[#F6B45A]/50 focus:outline-none"
            />
            <button
              onClick={addSkill}
              disabled={!newSkill.trim()}
              className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Add Common Skills */}
          <div className="space-y-1">
            <p className="text-[10px] text-gray-600">Quick add:</p>
            <div className="flex flex-wrap gap-1">
              {COMMON_SKILLS.filter(s => !formData.skills?.includes(s)).slice(0, 6).map(skill => (
                <button
                  key={skill}
                  onClick={() => quickAddSkill(skill)}
                  className="text-[10px] px-2 py-1 bg-white/5 hover:bg-blue-500/10 rounded text-gray-400 hover:text-blue-400 transition-colors"
                >
                  + {skill}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Certifications Section */}
        <div className="pt-4 border-t border-white/5">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-3">
            <BadgeCheck className="w-3 h-3 inline-block mr-1" />
            Certifications & Licenses
          </label>

          {/* Existing Certifications */}
          {(formData.certifications?.length ?? 0) > 0 && (
            <div className="space-y-2 mb-3">
              {formData.certifications?.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-start justify-between p-3 bg-white/[0.02] border border-white/5 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{cert.name}</p>
                    {cert.issuedBy && (
                      <p className="text-xs text-gray-500">Issued by: {cert.issuedBy}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(cert.issueDate).toLocaleDateString()}
                        {cert.expiryDate && ` - Expires: ${new Date(cert.expiryDate).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCertification(cert.id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Certification Button */}
          <button
            onClick={() => setShowCertModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border border-dashed border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/20 transition-all w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Certification</span>
          </button>
        </div>

        {/* Notes Section */}
        <div className="pt-4 border-t border-white/5">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
            <FileText className="w-3 h-3 inline-block mr-1" />
            Internal Notes
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add internal notes about this technician..."
            rows={3}
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm placeholder-gray-500
              focus:border-[#F6B45A]/50 focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Certification Modal */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#1a1a1a] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Add Certification</h3>
              <button
                onClick={() => setShowCertModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Certification Name *
                </label>
                <input
                  type="text"
                  placeholder="Licensed Electrician, Landscape Lighting Certification, etc."
                  value={newCert.name || ''}
                  onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm placeholder-gray-500
                    focus:border-[#F6B45A]/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Issued By
                </label>
                <input
                  type="text"
                  placeholder="Issuing organization (optional)"
                  value={newCert.issuedBy || ''}
                  onChange={(e) => setNewCert({ ...newCert, issuedBy: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm placeholder-gray-500
                    focus:border-[#F6B45A]/50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    value={newCert.issueDate || ''}
                    onChange={(e) => setNewCert({ ...newCert, issueDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm
                      focus:border-[#F6B45A]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={newCert.expiryDate || ''}
                    onChange={(e) => setNewCert({ ...newCert, expiryDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm
                      focus:border-[#F6B45A]/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={addCertification}
                  disabled={!newCert.name?.trim() || !newCert.issueDate}
                  className="flex-1 py-3 rounded-xl bg-[#F6B45A] text-black font-medium
                    hover:bg-[#f6c45a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Certification
                </button>
                <button
                  onClick={() => setShowCertModal(false)}
                  className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium
                    hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SettingsCard>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400 mb-6">
        Manage your technicians and crews. Assign them to locations and track their performance.
      </p>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search technicians..."
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

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
          >
            <option value="all">All Roles</option>
            <option value="lead">Lead Technician</option>
            <option value="technician">Technician</option>
            <option value="apprentice">Apprentice</option>
          </select>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
          >
            <option value="all">All Locations</option>
            {locations?.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            <option value="unassigned">Unassigned</option>
          </select>

          {/* Skills Filter */}
          {uniqueSkills.length > 0 && (
            <select
              value={skillsFilter}
              onChange={(e) => setSkillsFilter(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
            >
              <option value="all">All Skills</option>
              {uniqueSkills.map(skill => <option key={skill} value={skill}>{skill}</option>)}
            </select>
          )}

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
          >
            <option value="name">Name</option>
            <option value="role">Role</option>
            <option value="location">Location</option>
            <option value="date">Date Added</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || statusFilter !== 'all' || roleFilter !== 'all' || locationFilter !== 'all' || skillsFilter !== 'all') && (
        <p className="text-sm text-gray-400 mb-3">
          Showing {filteredAndSortedTechnicians.length} of {technicians?.length || 0} technicians
        </p>
      )}

      {/* Technician List */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {/* Grouped by Location */}
          {locations.map(location => {
            const techs = techniciansByLocation[location.id] || [];
            if (techs.length === 0) return null;

            return (
              <div key={location.id}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {location.name}
                  </span>
                  <span className="text-xs text-gray-600">({techs.length})</span>
                </div>
                <div className="space-y-3">
                  {techs.map(tech => (
                    <motion.div
                      key={tech.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {editingId === tech.id ? (
                        renderForm(false)
                      ) : (
                        <SettingsCard className="p-4 hover:border-white/10 transition-colors group">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl ${tech.isActive ? 'bg-blue-500/10' : 'bg-white/5'}`}>
                                  <Users className={`w-5 h-5 ${tech.isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-white">{tech.name}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-medium ${roleColors[tech.role]}`}>
                                      {roleLabels[tech.role]}
                                    </span>
                                    {!tech.isActive && (
                                      <span className="text-[10px] px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full uppercase font-medium">
                                        Inactive
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                    {tech.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="w-3 h-3" />
                                        {tech.email}
                                      </span>
                                    )}
                                    {tech.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {tech.phone}
                                      </span>
                                    )}
                                  </div>
                                  {/* Skills Tags */}
                                  {tech.skills && tech.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {tech.skills.slice(0, 4).map((skill) => (
                                        <span
                                          key={skill}
                                          className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full"
                                        >
                                          {skill}
                                        </span>
                                      ))}
                                      {tech.skills.length > 4 && (
                                        <span className="text-[10px] px-2 py-0.5 bg-white/5 text-gray-400 rounded-full">
                                          +{tech.skills.length - 4} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {/* Certifications Badge */}
                                  {tech.certifications && tech.certifications.length > 0 && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400">
                                      <BadgeCheck className="w-3 h-3" />
                                      <span>{tech.certifications.length} certification{tech.certifications.length !== 1 ? 's' : ''}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleStartEdit(tech)}
                                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(tech.id)}
                                  className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Performance Metrics Toggle */}
                            {technicianMetrics && technicianMetrics.find(m => m.technicianId === tech.id) && (
                              <>
                                <button
                                  onClick={() => toggleMetrics(tech.id)}
                                  className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span>{expandedMetrics.has(tech.id) ? 'Hide' : 'Show'} Performance</span>
                                  {expandedMetrics.has(tech.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>

                                {/* Metrics Section */}
                                <AnimatePresence>
                                  {expandedMetrics.has(tech.id) && (() => {
                                    const metrics = technicianMetrics.find(m => m.technicianId === tech.id);
                                    if (!metrics) return null;

                                    return (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5"
                                      >
                                        {/* Revenue */}
                                        <div>
                                          <div className="flex items-center gap-1 mb-1">
                                            <DollarSign className="w-3 h-3 text-[#F6B45A]" />
                                            <p className="text-[10px] text-gray-500">Revenue</p>
                                          </div>
                                          <p className="text-base font-bold text-[#F6B45A]">${(metrics.revenue / 1000).toFixed(1)}k</p>
                                        </div>

                                        {/* Jobs Completed */}
                                        <div>
                                          <div className="flex items-center gap-1 mb-1">
                                            <Briefcase className="w-3 h-3 text-emerald-400" />
                                            <p className="text-[10px] text-gray-500">Jobs</p>
                                          </div>
                                          <p className="text-base font-bold text-emerald-400">{metrics.jobsCompleted}</p>
                                        </div>

                                        {/* Avg Job Time */}
                                        <div>
                                          <div className="flex items-center gap-1 mb-1">
                                            <Clock className="w-3 h-3 text-blue-400" />
                                            <p className="text-[10px] text-gray-500">Avg Time</p>
                                          </div>
                                          <p className="text-base font-bold text-blue-400">{metrics.avgJobTime}h</p>
                                        </div>

                                        {/* Efficiency */}
                                        <div>
                                          <div className="flex items-center gap-1 mb-1">
                                            <Target className="w-3 h-3 text-purple-400" />
                                            <p className="text-[10px] text-gray-500">Efficiency</p>
                                          </div>
                                          <p className="text-base font-bold text-purple-400">{metrics.efficiency}%</p>
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
                </div>
              </div>
            );
          })}

          {/* Unassigned Technicians */}
          {(techniciansByLocation['unassigned'] || []).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Unassigned
                </span>
                <span className="text-xs text-gray-600">({techniciansByLocation['unassigned'].length})</span>
              </div>
              <div className="space-y-3">
                {techniciansByLocation['unassigned'].map(tech => (
                  <motion.div
                    key={tech.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {editingId === tech.id ? (
                      renderForm(false)
                    ) : (
                      <SettingsCard className="p-4 hover:border-white/10 transition-colors group">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-xl ${tech.isActive ? 'bg-blue-500/10' : 'bg-white/5'}`}>
                                <Users className={`w-5 h-5 ${tech.isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-semibold text-white">{tech.name}</h3>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-medium ${roleColors[tech.role]}`}>
                                    {roleLabels[tech.role]}
                                  </span>
                                  {!tech.isActive && (
                                    <span className="text-[10px] px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full uppercase font-medium">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                  {tech.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {tech.email}
                                    </span>
                                  )}
                                  {tech.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {tech.phone}
                                    </span>
                                  )}
                                </div>
                                {/* Skills Tags */}
                                {tech.skills && tech.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {tech.skills.slice(0, 4).map((skill) => (
                                      <span
                                        key={skill}
                                        className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                    {tech.skills.length > 4 && (
                                      <span className="text-[10px] px-2 py-0.5 bg-white/5 text-gray-400 rounded-full">
                                        +{tech.skills.length - 4} more
                                      </span>
                                    )}
                                  </div>
                                )}
                                {/* Certifications Badge */}
                                {tech.certifications && tech.certifications.length > 0 && (
                                  <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400">
                                    <BadgeCheck className="w-3 h-3" />
                                    <span>{tech.certifications.length} certification{tech.certifications.length !== 1 ? 's' : ''}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStartEdit(tech)}
                                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(tech.id)}
                                className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Performance Metrics Toggle */}
                          {technicianMetrics && technicianMetrics.find(m => m.technicianId === tech.id) && (
                            <>
                              <button
                                onClick={() => toggleMetrics(tech.id)}
                                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>{expandedMetrics.has(tech.id) ? 'Hide' : 'Show'} Performance</span>
                                {expandedMetrics.has(tech.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>

                              {/* Metrics Section */}
                              <AnimatePresence>
                                {expandedMetrics.has(tech.id) && (() => {
                                  const metrics = technicianMetrics.find(m => m.technicianId === tech.id);
                                  if (!metrics) return null;

                                  return (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5"
                                    >
                                      {/* Revenue */}
                                      <div>
                                        <div className="flex items-center gap-1 mb-1">
                                          <DollarSign className="w-3 h-3 text-[#F6B45A]" />
                                          <p className="text-[10px] text-gray-500">Revenue</p>
                                        </div>
                                        <p className="text-base font-bold text-[#F6B45A]">${(metrics.revenue / 1000).toFixed(1)}k</p>
                                      </div>

                                      {/* Jobs Completed */}
                                      <div>
                                        <div className="flex items-center gap-1 mb-1">
                                          <Briefcase className="w-3 h-3 text-emerald-400" />
                                          <p className="text-[10px] text-gray-500">Jobs</p>
                                        </div>
                                        <p className="text-base font-bold text-emerald-400">{metrics.jobsCompleted}</p>
                                      </div>

                                      {/* Avg Job Time */}
                                      <div>
                                        <div className="flex items-center gap-1 mb-1">
                                          <Clock className="w-3 h-3 text-blue-400" />
                                          <p className="text-[10px] text-gray-500">Avg Time</p>
                                        </div>
                                        <p className="text-base font-bold text-blue-400">{metrics.avgJobTime}h</p>
                                      </div>

                                      {/* Efficiency */}
                                      <div>
                                        <div className="flex items-center gap-1 mb-1">
                                          <Target className="w-3 h-3 text-purple-400" />
                                          <p className="text-[10px] text-gray-500">Efficiency</p>
                                        </div>
                                        <p className="text-base font-bold text-purple-400">{metrics.efficiency}%</p>
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
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Create New Technician Form */}
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {renderForm(true)}
          </motion.div>
        )}
      </div>

      {/* Add Technician Button */}
      {!isCreating && (
        <button
          onClick={handleStartCreate}
          className="w-full flex items-center justify-center gap-2 py-4 bg-white/[0.02] border border-dashed border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/[0.03] transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Technician</span>
        </button>
      )}

      {/* Empty State */}
      {(technicians || []).length === 0 && !isCreating && (
        <div className="text-center py-8">
          <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Technicians Yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Add your technicians to track performance and assign them to jobs.
          </p>
        </div>
      )}

      {/* Tip */}
      {(locations || []).length === 0 && (technicians || []).length === 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-sm text-amber-400">
            <strong>Tip:</strong> Add locations first to organize your technicians by site.
          </p>
        </div>
      )}

      {/* No Results State */}
      {(technicians || []).length > 0 && filteredAndSortedTechnicians.length === 0 && !isCreating && (
        <div className="text-center py-8">
          <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Technicians Found</h3>
          <p className="text-sm text-gray-500 mb-4">
            Try adjusting your search or filter criteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setRoleFilter('all');
              setLocationFilter('all');
              setSkillsFilter('all');
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
