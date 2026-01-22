import React, { useState } from 'react';
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
  X
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
  const editableMembers = members.filter(m => m.role !== 'owner');
  const ownerMember = members.find(m => m.role === 'owner');

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
            <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F6B45A] text-black font-medium
              hover:bg-[#f6c45a] transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite</span>
          </button>
        )}
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
      {editableMembers.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Team</h4>
          {editableMembers.map((member) => (
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
      {invites.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Pending Invites</h4>
          {invites.map((invite) => (
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
      {editableMembers.length === 0 && invites.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No team members yet</p>
          {isOwner && (
            <p className="text-sm text-gray-500 mt-1">Invite your first team member to get started</p>
          )}
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
                      <option value="admin" className="bg-[#1a1a1a]">Office Manager</option>
                      <option value="salesperson" className="bg-[#1a1a1a]">Salesperson</option>
                      <option value="lead_technician" className="bg-[#1a1a1a]">Lead Technician</option>
                      <option value="technician" className="bg-[#1a1a1a]">Technician</option>
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
                        <option value="" className="bg-[#1a1a1a]">All Locations</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id} className="bg-[#1a1a1a]">
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

const MemberCard: React.FC<MemberCardProps> = ({ member, locations, isOwner, onRemove }) => {
  const locationName = member.locationId
    ? locations.find(l => l.id === member.locationId)?.name || 'Unknown'
    : 'All Locations';

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

          {/* Remove button */}
          {isOwner && (
            <button
              onClick={onRemove}
              className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
