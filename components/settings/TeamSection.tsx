import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  MapPin,
  Trash2,
  Copy,
  Check,
  Clock,
  AlertCircle,
  ChevronDown,
  X,
  Search,
  Edit3,
  Save,
  UserCheck,
  Building2,
  TrendingUp
} from 'lucide-react';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useLocations } from '../../hooks/useLocations';
import { OrganizationMember, OrganizationInvite, OrganizationRole } from '../../types';

const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Office Manager',
  salesperson: 'Salesperson',
  lead_technician: 'Lead Technician',
  technician: 'Technician'
};

const ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  owner: 'Full access to everything',
  admin: 'Manage operations, no billing access',
  salesperson: 'Create quotes, manage assigned clients',
  lead_technician: 'Manage crew, view location analytics',
  technician: 'View assigned jobs only'
};

const ROLE_COLORS: Record<OrganizationRole, string> = {
  owner: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  salesperson: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  lead_technician: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  technician: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

interface TeamSectionProps {
  isOwner: boolean;
}

export const TeamSection: React.FC<TeamSectionProps> = ({ isOwner }) => {
  const { members, invites, isLoading, error, sendInvite, cancelInvite, updateMember, removeMember } = useTeamMembers();
  const { locations } = useLocations();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<OrganizationRole, 'owner'>>('salesperson');
  const [inviteLocationId, setInviteLocationId] = useState<string>('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Bulk Invite State
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkRole, setBulkRole] = useState<Exclude<OrganizationRole, 'owner'>>('salesperson');
  const [bulkLocationId, setBulkLocationId] = useState<string>('');
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ successful: number; failed: number } | null>(null);

  // Show permissions matrix
  const [showPermissions, setShowPermissions] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | OrganizationRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'all-access' | string>('all');

  // Parse bulk emails
  const parsedEmails = useMemo(() => {
    return bulkEmails
      .split(/[\n,]+/)
      .map(email => email.trim())
      .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  }, [bulkEmails]);

  const handleBulkInvite = async () => {
    if (parsedEmails.length === 0) return;

    setIsBulkSending(true);
    setBulkResults(null);

    const results = await Promise.allSettled(
      parsedEmails.map(email =>
        sendInvite(email, bulkRole, bulkLocationId || undefined)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any)?.inviteLink).length;
    const failed = results.length - successful;

    setBulkResults({ successful, failed });
    setIsBulkSending(false);

    if (successful > 0 && failed === 0) {
      // All succeeded, close after delay
      setTimeout(() => {
        setShowBulkInvite(false);
        setBulkEmails('');
        setBulkResults(null);
      }, 2000);
    }
  };

  const handleCloseBulkInvite = () => {
    setShowBulkInvite(false);
    setBulkEmails('');
    setBulkRole('salesperson');
    setBulkLocationId('');
    setBulkResults(null);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;

    setIsSending(true);
    setInviteError(null);

    const result = await sendInvite(
      inviteEmail.trim(),
      inviteRole,
      inviteLocationId || undefined
    );

    setIsSending(false);

    if (result.inviteLink) {
      setInviteLink(result.inviteLink);
    } else {
      setInviteError('Failed to send invite. Please try again.');
    }
  };

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('salesperson');
    setInviteLocationId('');
    setInviteLink(null);
    setInviteError(null);
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (window.confirm(`Remove ${member.userName} from the team?`)) {
      await removeMember(member.id);
    }
  };

  const handleCancelInvite = async (invite: OrganizationInvite) => {
    if (window.confirm(`Cancel invite for ${invite.email}?`)) {
      await cancelInvite(invite.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F6B45A] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // Filter out owner from editable members
  const editableMembers = (members || []).filter(m => m.role !== 'owner');
  const ownerMember = (members || []).find(m => m.role === 'owner');

  // Team capacity calculations
  const teamStats = useMemo(() => {
    const membersList = members || [];
    const invitesList = invites || [];
    const activeMembers = membersList.filter(m => m.isActive);
    const roleBreakdown = {
      admin: activeMembers.filter(m => m.role === 'admin').length,
      salesperson: activeMembers.filter(m => m.role === 'salesperson').length,
      lead_technician: activeMembers.filter(m => m.role === 'lead_technician').length,
      technician: activeMembers.filter(m => m.role === 'technician').length
    };

    const locationsWithMembers = new Set(
      activeMembers.filter(m => m.locationId).map(m => m.locationId)
    ).size;

    return {
      totalActive: activeMembers.length,
      pendingInvites: invitesList.length,
      locationsWithMembers,
      totalLocations: locations?.length || 0,
      roleBreakdown
    };
  }, [members, invites, locations]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    let filtered = editableMembers || [];

    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== 'all') filtered = filtered.filter(m => m.role === roleFilter);

    if (locationFilter === 'all-access') {
      filtered = filtered.filter(m => !m.locationId);
    } else if (locationFilter !== 'all') {
      filtered = filtered.filter(m => m.locationId === locationFilter);
    }

    return filtered.sort((a, b) => a.userName?.localeCompare(b.userName || '') || 0);
  }, [editableMembers, searchQuery, roleFilter, locationFilter]);

  // Filtered Invites
  const filteredInvites = useMemo(() => {
    let filtered = invites || [];

    if (searchQuery) {
      filtered = filtered.filter(inv =>
        inv.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== 'all') filtered = filtered.filter(inv => inv.role === roleFilter);

    if (locationFilter === 'all-access') {
      filtered = filtered.filter(inv => !inv.locationId);
    } else if (locationFilter !== 'all') {
      filtered = filtered.filter(inv => inv.locationId === locationFilter);
    }

    return filtered;
  }, [invites, searchQuery, roleFilter, locationFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#F6B45A]/20">
            <Users className="w-5 h-5 text-[#F6B45A]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Team Members</h3>
            <p className="text-sm text-gray-500">{(members || []).length} member{(members || []).length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkInvite(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-medium
                hover:bg-white/10 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Bulk Invite</span>
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F6B45A] text-black font-medium
                hover:bg-[#f6c45a] transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite</span>
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search team members..."
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
            <option value="all" className="bg-[#1a1a1a] text-white">All Status</option>
            <option value="active" className="bg-[#1a1a1a] text-white">Active Members</option>
            <option value="pending" className="bg-[#1a1a1a] text-white">Pending Invites</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
          >
            <option value="all" className="bg-[#1a1a1a] text-white">All Roles</option>
            <option value="admin" className="bg-[#1a1a1a] text-white">Office Manager</option>
            <option value="salesperson" className="bg-[#1a1a1a] text-white">Salesperson</option>
            <option value="lead_technician" className="bg-[#1a1a1a] text-white">Lead Technician</option>
            <option value="technician" className="bg-[#1a1a1a] text-white">Technician</option>
          </select>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
          >
            <option value="all" className="bg-[#1a1a1a] text-white">All Locations</option>
            <option value="all-access" className="bg-[#1a1a1a] text-white">All Locations Access</option>
            {locations?.map(loc => <option key={loc.id} value={loc.id} className="bg-[#1a1a1a] text-white">{loc.name}</option>)}
          </select>
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all' || locationFilter !== 'all') && (
        <p className="text-sm text-gray-400">
          Showing {statusFilter === 'pending' ? filteredInvites.length : filteredMembers.length} of {statusFilter === 'pending' ? (invites || []).length : editableMembers.length} {statusFilter === 'pending' ? 'invites' : 'members'}
        </p>
      )}

      {/* Team Capacity Dashboard */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            Team Overview
          </h4>
          <button
            onClick={() => setShowPermissions(!showPermissions)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showPermissions ? 'Hide' : 'View'} Role Permissions
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <UserCheck className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-xl font-bold text-white">{teamStats.totalActive}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Active Members</p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <Clock className="w-5 h-5 text-yellow-400 mb-2" />
            <p className="text-xl font-bold text-white">{teamStats.pendingInvites}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pending Invites</p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <Building2 className="w-5 h-5 text-emerald-400 mb-2" />
            <p className="text-xl font-bold text-white">
              {teamStats.locationsWithMembers}/{teamStats.totalLocations}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Location Coverage</p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <Users className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-xl font-bold text-white">
              {teamStats.roleBreakdown.technician + teamStats.roleBreakdown.lead_technician}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Field Techs</p>
          </div>
        </div>

        {/* Role Breakdown */}
        <div className="flex flex-wrap gap-2">
          {teamStats.roleBreakdown.admin > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-xs text-gray-300">Office Managers: {teamStats.roleBreakdown.admin}</span>
            </div>
          )}
          {teamStats.roleBreakdown.salesperson > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs text-gray-300">Salespeople: {teamStats.roleBreakdown.salesperson}</span>
            </div>
          )}
          {teamStats.roleBreakdown.lead_technician > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-gray-300">Lead Techs: {teamStats.roleBreakdown.lead_technician}</span>
            </div>
          )}
          {teamStats.roleBreakdown.technician > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-500/10 border border-gray-500/20 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-xs text-gray-300">Technicians: {teamStats.roleBreakdown.technician}</span>
            </div>
          )}
        </div>

        {/* Permissions Matrix */}
        <AnimatePresence>
          {showPermissions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-white/10">
                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Role Permissions</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left py-2 pr-4 font-medium">Permission</th>
                        <th className="text-center px-2 py-2 font-medium">Owner</th>
                        <th className="text-center px-2 py-2 font-medium">Admin</th>
                        <th className="text-center px-2 py-2 font-medium">Sales</th>
                        <th className="text-center px-2 py-2 font-medium">Lead</th>
                        <th className="text-center px-2 py-2 font-medium">Tech</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr className="border-t border-white/5">
                        <td className="py-2 pr-4">Manage team members</td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><X className="w-3 h-3 text-red-400 mx-auto" /></td>
                        <td className="text-center px-2"><X className="w-3 h-3 text-red-400 mx-auto" /></td>
                        <td className="text-center px-2"><X className="w-3 h-3 text-red-400 mx-auto" /></td>
                      </tr>
                      <tr className="border-t border-white/5">
                        <td className="py-2 pr-4">View all locations</td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><span className="text-yellow-400">Own</span></td>
                        <td className="text-center px-2"><span className="text-yellow-400">Own</span></td>
                      </tr>
                      <tr className="border-t border-white/5">
                        <td className="py-2 pr-4">Create/edit projects</td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><span className="text-yellow-400">Own</span></td>
                        <td className="text-center px-2"><span className="text-yellow-400">Assigned</span></td>
                      </tr>
                      <tr className="border-t border-white/5">
                        <td className="py-2 pr-4">View analytics</td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><span className="text-yellow-400">Own</span></td>
                        <td className="text-center px-2"><X className="w-3 h-3 text-red-400 mx-auto" /></td>
                      </tr>
                      <tr className="border-t border-white/5">
                        <td className="py-2 pr-4">Manage billing</td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><X className="w-3 h-3 text-red-400 mx-auto" /></td>
                        <td className="text-center px-2"><X className="w-3 h-3 text-red-400 mx-auto" /></td>
                        <td className="text-center px-2"><X className="w-3 h-3 text-red-400 mx-auto" /></td>
                        <td className="text-center px-2"><X className="w-3 h-3 text-red-400 mx-auto" /></td>
                      </tr>
                      <tr className="border-t border-white/5">
                        <td className="py-2 pr-4">Manage crew</td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><X className="w-3 h-3 text-red-400 mx-auto" /></td>
                        <td className="text-center px-2"><Check className="w-3 h-3 text-emerald-400 mx-auto" /></td>
                        <td className="text-center px-2"><X className="w-3 h-3 text-red-400 mx-auto" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Owner Card */}
      {ownerMember && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-white">{ownerMember.userName}</p>
                <p className="text-sm text-gray-500">{ownerMember.userEmail}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${ROLE_COLORS.owner}`}>
              Owner
            </span>
          </div>
        </div>
      )}

      {/* Team Members List */}
      {statusFilter !== 'pending' && filteredMembers.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Team</h4>
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              locations={locations}
              isOwner={isOwner}
              onUpdate={updateMember}
              onRemove={() => handleRemoveMember(member)}
            />
          ))}
        </div>
      )}

      {/* Pending Invites */}
      {statusFilter !== 'active' && filteredInvites.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Pending Invites</h4>
          {filteredInvites.map((invite) => (
            <InviteCard
              key={invite.id}
              invite={invite}
              isOwner={isOwner}
              onCancel={() => handleCancelInvite(invite)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {editableMembers.length === 0 && (invites || []).length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No team members yet</p>
          {isOwner && (
            <p className="text-sm text-gray-500 mt-1">Invite your first team member to get started</p>
          )}
        </div>
      )}

      {/* No Results State */}
      {(editableMembers.length > 0 || (invites || []).length > 0) &&
       filteredMembers.length === 0 && filteredInvites.length === 0 && (
        <div className="text-center py-8">
          <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Results Found</h3>
          <p className="text-sm text-gray-500 mb-4">
            Try adjusting your search or filter criteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('all');
              setStatusFilter('all');
              setLocationFilter('all');
            }}
            className="text-sm text-[#F6B45A] hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#1a1a1a] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Invite Team Member</h3>
              <button
                onClick={handleCloseInviteModal}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {!inviteLink ? (
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="team@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10
                        text-white placeholder-gray-500 focus:outline-none focus:border-[#F6B45A]/50"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as Exclude<OrganizationRole, 'owner'>)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10
                        text-white appearance-none cursor-pointer focus:outline-none focus:border-[#F6B45A]/50"
                    >
                      <option value="admin" className="bg-[#1a1a1a] text-white">Office Manager</option>
                      <option value="salesperson" className="bg-[#1a1a1a] text-white">Salesperson</option>
                      <option value="lead_technician" className="bg-[#1a1a1a] text-white">Lead Technician</option>
                      <option value="technician" className="bg-[#1a1a1a] text-white">Technician</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{ROLE_DESCRIPTIONS[inviteRole]}</p>
                </div>

                {/* Location (for technicians) */}
                {(inviteRole === 'technician' || inviteRole === 'lead_technician') && locations.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Location (Optional)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <select
                        value={inviteLocationId}
                        onChange={(e) => setInviteLocationId(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10
                          text-white appearance-none cursor-pointer focus:outline-none focus:border-[#F6B45A]/50"
                      >
                        <option value="" className="bg-[#1a1a1a] text-white">All Locations</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id} className="bg-[#1a1a1a] text-white">
                            {loc.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                )}

                {inviteError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {inviteError}
                  </div>
                )}

                <button
                  onClick={handleSendInvite}
                  disabled={!inviteEmail.trim() || isSending}
                  className="w-full py-3 rounded-xl bg-[#F6B45A] text-black font-medium
                    hover:bg-[#f6c45a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/30 border-t-black" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Send Invite</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Invite Created!</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Share this link with {inviteEmail} to join your team.
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="w-full pr-12 pl-4 py-3 rounded-xl bg-white/5 border border-white/10
                      text-white text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg
                      hover:bg-white/10 transition-colors"
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  This invite link expires in 7 days
                </p>

                <button
                  onClick={handleCloseInviteModal}
                  className="w-full py-3 rounded-xl bg-white/10 text-white font-medium
                    hover:bg-white/20 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Invite Modal */}
      {showBulkInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#1a1a1a] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Bulk Invite Team Members</h3>
                  <p className="text-xs text-gray-500">Invite multiple team members at once</p>
                </div>
              </div>
              <button
                onClick={handleCloseBulkInvite}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {!bulkResults ? (
              <div className="space-y-4">
                {/* Email Textarea */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email Addresses</label>
                  <textarea
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    placeholder={"Enter email addresses (one per line or comma-separated)\nemail1@example.com, email2@example.com\nemail3@example.com"}
                    rows={5}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#F6B45A]/50 resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {parsedEmails.length} valid email{parsedEmails.length !== 1 ? 's' : ''} detected
                  </p>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Role for All</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select
                      value={bulkRole}
                      onChange={(e) => setBulkRole(e.target.value as Exclude<OrganizationRole, 'owner'>)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10
                        text-white appearance-none cursor-pointer focus:outline-none focus:border-[#F6B45A]/50"
                    >
                      <option value="admin" className="bg-[#1a1a1a] text-white">Office Manager</option>
                      <option value="salesperson" className="bg-[#1a1a1a] text-white">Salesperson</option>
                      <option value="lead_technician" className="bg-[#1a1a1a] text-white">Lead Technician</option>
                      <option value="technician" className="bg-[#1a1a1a] text-white">Technician</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{ROLE_DESCRIPTIONS[bulkRole]}</p>
                </div>

                {/* Location (for technicians) */}
                {(bulkRole === 'technician' || bulkRole === 'lead_technician') && locations.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Location (Optional)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <select
                        value={bulkLocationId}
                        onChange={(e) => setBulkLocationId(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10
                          text-white appearance-none cursor-pointer focus:outline-none focus:border-[#F6B45A]/50"
                      >
                        <option value="" className="bg-[#1a1a1a] text-white">All Locations</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id} className="bg-[#1a1a1a] text-white">
                            {loc.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Preview */}
                {parsedEmails.length > 0 && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 max-h-32 overflow-y-auto">
                    <p className="text-xs text-gray-500 mb-2">Preview ({parsedEmails.length} invites):</p>
                    <div className="space-y-1">
                      {parsedEmails.map((email, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                          <Mail className="w-3 h-3 text-gray-500" />
                          {email}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleBulkInvite}
                    disabled={parsedEmails.length === 0 || isBulkSending}
                    className="flex-1 py-3 rounded-xl bg-[#F6B45A] text-black font-medium
                      hover:bg-[#f6c45a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center justify-center gap-2"
                  >
                    {isBulkSending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/30 border-t-black" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Send {parsedEmails.length} Invite{parsedEmails.length !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCloseBulkInvite}
                    className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium
                      hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl ${
                  bulkResults.failed === 0
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : 'bg-yellow-500/10 border border-yellow-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {bulkResults.failed === 0 ? (
                      <>
                        <Check className="w-5 h-5 text-emerald-400" />
                        <span className="font-medium text-emerald-400">All Invites Sent!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        <span className="font-medium text-yellow-400">Partially Completed</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      {bulkResults.successful} invite{bulkResults.successful !== 1 ? 's' : ''} sent successfully
                    </p>
                    {bulkResults.failed > 0 && (
                      <p className="flex items-center gap-2">
                        <X className="w-4 h-4 text-red-400" />
                        {bulkResults.failed} invite{bulkResults.failed !== 1 ? 's' : ''} failed
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleCloseBulkInvite}
                  className="w-full py-3 rounded-xl bg-white/10 text-white font-medium
                    hover:bg-white/20 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Member Card Component
interface MemberCardProps {
  member: OrganizationMember;
  locations: { id: string; name: string }[];
  isOwner: boolean;
  onUpdate: (memberId: string, updates: { role?: OrganizationRole; locationId?: string | null; isActive?: boolean }) => Promise<boolean>;
  onRemove: () => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, locations, isOwner, onUpdate, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editRole, setEditRole] = useState<Exclude<OrganizationRole, 'owner'>>(member.role as Exclude<OrganizationRole, 'owner'>);
  const [editLocationId, setEditLocationId] = useState<string>(member.locationId || '');
  const [isSaving, setIsSaving] = useState(false);

  const locationName = member.locationId
    ? locations.find(l => l.id === member.locationId)?.name || 'Unknown'
    : 'All Locations';

  const handleStartEdit = () => {
    setEditRole(member.role as Exclude<OrganizationRole, 'owner'>);
    setEditLocationId(member.locationId || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditRole(member.role as Exclude<OrganizationRole, 'owner'>);
    setEditLocationId(member.locationId || '');
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    const updates: { role?: OrganizationRole; locationId?: string | null } = {};

    if (editRole !== member.role) {
      updates.role = editRole;
    }

    const newLocationId = editLocationId || null;
    if (newLocationId !== member.locationId) {
      updates.locationId = newLocationId;
    }

    if (Object.keys(updates).length > 0) {
      const success = await onUpdate(member.id, updates);
      if (success) {
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const showLocationSelect = editRole === 'technician' || editRole === 'lead_technician';

  return (
    <div className={`p-4 rounded-xl border transition-colors ${
      member.isActive
        ? 'bg-white/5 border-white/10'
        : 'bg-white/2 border-white/5 opacity-60'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-lg font-medium text-white">
              {member.userName?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">{member.userName}</p>
              {!member.isActive && (
                <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{member.userEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isEditing ? (
            <>
              {/* Location badge */}
              {(member.role === 'technician' || member.role === 'lead_technician') && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />
                  {locationName}
                </span>
              )}

              {/* Role badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${ROLE_COLORS[member.role]}`}>
                {ROLE_LABELS[member.role]}
              </span>

              {/* Edit button */}
              {isOwner && (
                <button
                  onClick={handleStartEdit}
                  className="p-2 rounded-lg hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-colors"
                  title="Edit role"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}

              {/* Remove button */}
              {isOwner && (
                <button
                  onClick={onRemove}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <>
              {/* Role Select */}
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as Exclude<OrganizationRole, 'owner'>)}
                className="px-3 py-1.5 bg-white/5 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
              >
                <option value="admin" className="bg-[#1a1a1a] text-white">Office Manager</option>
                <option value="salesperson" className="bg-[#1a1a1a] text-white">Salesperson</option>
                <option value="lead_technician" className="bg-[#1a1a1a] text-white">Lead Technician</option>
                <option value="technician" className="bg-[#1a1a1a] text-white">Technician</option>
              </select>

              {/* Location Select (for technicians) */}
              {showLocationSelect && locations.length > 0 && (
                <select
                  value={editLocationId}
                  onChange={(e) => setEditLocationId(e.target.value)}
                  className="px-3 py-1.5 bg-white/5 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
                >
                  <option value="" className="bg-[#1a1a1a] text-white">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id} className="bg-[#1a1a1a] text-white">
                      {loc.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Save button */}
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors disabled:opacity-50"
                title="Save changes"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-400/30 border-t-emerald-400" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </button>

              {/* Cancel button */}
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Invite Card Component
interface InviteCardProps {
  invite: OrganizationInvite;
  isOwner: boolean;
  onCancel: () => void;
}

const InviteCard: React.FC<InviteCardProps> = ({ invite, isOwner, onCancel }) => {
  const expiresAt = new Date(invite.expiresAt);
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-dashed border-white/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <Mail className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="font-medium text-white">{invite.email}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${ROLE_COLORS[invite.role]}`}>
            {ROLE_LABELS[invite.role]}
          </span>

          {isOwner && (
            <button
              onClick={onCancel}
              className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamSection;
