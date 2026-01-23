import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Look up Supabase user ID from Clerk user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const supabaseUserId = userData.id;

    // Get user's organization and role
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_user_id', supabaseUserId)
      .single();

    let organizationId: string | null = null;
    let userRole: string | null = null;

    if (org) {
      organizationId = org.id;
      userRole = 'owner';
    } else {
      // Check membership
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', supabaseUserId)
        .eq('is_active', true)
        .single();

      if (membership) {
        organizationId = membership.organization_id;
        userRole = membership.role;
      }
    }

    if (!organizationId) {
      return res.status(404).json({ error: 'User does not belong to an organization' });
    }

    // GET: List all members of the organization
    if (req.method === 'GET') {
      const { data: members, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          location_id,
          invited_by,
          invited_at,
          accepted_at,
          is_active,
          created_at,
          users (
            id,
            email,
            full_name
          ),
          locations (
            id,
            name
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Format response
      const formattedMembers = (members || []).map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role,
        locationId: m.location_id,
        locationName: m.locations?.name || null,
        invitedBy: m.invited_by,
        invitedAt: m.invited_at,
        acceptedAt: m.accepted_at,
        isActive: m.is_active,
        createdAt: m.created_at,
        userName: m.users?.full_name || m.users?.email || 'Unknown',
        userEmail: m.users?.email
      }));

      return res.status(200).json({ success: true, data: formattedMembers });
    }

    // PATCH: Update a member's role or status (owner/admin only)
    if (req.method === 'PATCH') {
      if (userRole !== 'owner' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Only owner or admin can update members' });
      }

      const { memberId, role, locationId, isActive } = req.body;

      if (!memberId) {
        return res.status(400).json({ error: 'memberId is required' });
      }

      // Prevent changing owner's role
      const { data: targetMember } = await supabase
        .from('organization_members')
        .select('role, user_id')
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .single();

      if (!targetMember) {
        return res.status(404).json({ error: 'Member not found' });
      }

      if (targetMember.role === 'owner') {
        return res.status(403).json({ error: 'Cannot modify owner role' });
      }

      // Admin can't promote to owner or admin
      if (userRole === 'admin' && (role === 'owner' || role === 'admin')) {
        return res.status(403).json({ error: 'Admin cannot promote to owner or admin' });
      }

      const updates: Record<string, any> = {};
      if (role !== undefined) updates.role = role;
      if (locationId !== undefined) updates.location_id = locationId;
      if (isActive !== undefined) updates.is_active = isActive;

      const { data, error } = await supabase
        .from('organization_members')
        .update(updates)
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    // DELETE: Remove a member (owner or admin)
    if (req.method === 'DELETE') {
      if (userRole !== 'owner' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Only owner or admin can remove members' });
      }

      const { memberId } = req.body;

      if (!memberId) {
        return res.status(400).json({ error: 'memberId is required' });
      }

      // Prevent removing owner
      const { data: targetMember } = await supabase
        .from('organization_members')
        .select('role')
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .single();

      if (!targetMember) {
        return res.status(404).json({ error: 'Member not found' });
      }

      if (targetMember.role === 'owner') {
        return res.status(403).json({ error: 'Cannot remove organization owner' });
      }

      // Admin cannot remove other admins
      if (userRole === 'admin' && targetMember.role === 'admin') {
        return res.status(403).json({ error: 'Admin cannot remove other admins' });
      }

      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Member removed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Organization members API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
