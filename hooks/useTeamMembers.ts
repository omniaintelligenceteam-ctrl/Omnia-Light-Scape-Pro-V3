import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { OrganizationMember, OrganizationInvite, OrganizationRole } from '../types';

interface UseTeamMembersResult {
  members: OrganizationMember[];
  invites: OrganizationInvite[];
  isLoading: boolean;
  error: string | null;
  // Member management
  updateMember: (memberId: string, updates: { role?: OrganizationRole; locationId?: string | null; isActive?: boolean }) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  // Invite management
  sendInvite: (email: string, role: Exclude<OrganizationRole, 'owner'>, locationId?: string) => Promise<{ invite: OrganizationInvite | null; inviteLink: string | null }>;
  cancelInvite: (inviteId: string) => Promise<boolean>;
  // Helpers
  getMembersByRole: (role: OrganizationRole) => OrganizationMember[];
  getMembersByLocation: (locationId: string) => OrganizationMember[];
  refetch: () => Promise<void>;
}

export function useTeamMembers(): UseTeamMembersResult {
  const { user } = useUser();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!user?.id) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/organizations/members?userId=${user.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          // User doesn't belong to an organization yet
          setMembers([]);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch team members');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setMembers(data.data);
      }
    } catch (err: any) {
      console.error('Error fetching team members:', err);
      setError(err.message || 'Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchInvites = useCallback(async () => {
    if (!user?.id) {
      setInvites([]);
      return;
    }

    try {
      const response = await fetch(`/api/organizations/invites?userId=${user.id}`);
      if (!response.ok) {
        if (response.status === 403 || response.status === 404) {
          // Not authorized or no org
          setInvites([]);
          return;
        }
        throw new Error('Failed to fetch invites');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setInvites(data.data);
      }
    } catch (err: any) {
      console.error('Error fetching invites:', err);
      // Don't set error for invites as it's not critical
    }
  }, [user?.id]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchMembers(), fetchInvites()]);
  }, [fetchMembers, fetchInvites]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updateMember = async (
    memberId: string,
    updates: { role?: OrganizationRole; locationId?: string | null; isActive?: boolean }
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await fetch(`/api/organizations/members?userId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          role: updates.role,
          locationId: updates.locationId,
          isActive: updates.isActive
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update member');
      }

      // Refresh members list
      await fetchMembers();
      return true;
    } catch (err: any) {
      console.error('Error updating member:', err);
      setError(err.message);
      return false;
    }
  };

  const removeMember = async (memberId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await fetch(`/api/organizations/members?userId=${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove member');
      }

      setMembers(prev => prev.filter(m => m.id !== memberId));
      return true;
    } catch (err: any) {
      console.error('Error removing member:', err);
      setError(err.message);
      return false;
    }
  };

  const sendInvite = async (
    email: string,
    role: Exclude<OrganizationRole, 'owner'>,
    locationId?: string
  ): Promise<{ invite: OrganizationInvite | null; inviteLink: string | null }> => {
    if (!user?.id) return { invite: null, inviteLink: null };

    try {
      const response = await fetch(`/api/organizations/invites?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, locationId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invite');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh invites list
        await fetchInvites();
        return {
          invite: data.data,
          inviteLink: data.inviteLink
        };
      }
      return { invite: null, inviteLink: null };
    } catch (err: any) {
      console.error('Error sending invite:', err);
      setError(err.message);
      return { invite: null, inviteLink: null };
    }
  };

  const cancelInvite = async (inviteId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await fetch(`/api/organizations/invites?userId=${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel invite');
      }

      setInvites(prev => prev.filter(i => i.id !== inviteId));
      return true;
    } catch (err: any) {
      console.error('Error cancelling invite:', err);
      setError(err.message);
      return false;
    }
  };

  // Helper to get members by role
  const getMembersByRole = (role: OrganizationRole): OrganizationMember[] => {
    return members.filter(m => m.role === role && m.isActive);
  };

  // Helper to get members by location
  const getMembersByLocation = (locationId: string): OrganizationMember[] => {
    return members.filter(m =>
      m.isActive && (m.locationId === locationId || m.locationId === null)
    );
  };

  return {
    members,
    invites,
    isLoading,
    error,
    updateMember,
    removeMember,
    sendInvite,
    cancelInvite,
    getMembersByRole,
    getMembersByLocation,
    refetch
  };
}
