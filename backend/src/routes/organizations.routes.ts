import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import crypto from 'crypto';

const router = Router();

// Helper to get user's organization
async function getUserOrganization(clerkUserId: string) {
  if (!supabase) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (!userData) return null;

  return {
    supabaseUserId: userData.id,
    organizationId: userData.organization_id
  };
}

// ============================================
// MEMBERS ENDPOINTS
// ============================================

// GET /api/organizations/members - List all members
router.get('/members', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const userOrg = await getUserOrganization(clerkUserId);
    if (!userOrg || !userOrg.organizationId) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        user_id,
        role,
        location_id,
        is_active,
        created_at,
        users:user_id (
          id,
          email,
          full_name,
          avatar_url
        ),
        locations:location_id (
          id,
          name
        )
      `)
      .eq('organization_id', userOrg.organizationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Transform to expected format (TeamSection expects userName, userEmail)
    const members = (data || []).map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      userEmail: m.users?.email,
      userName: m.users?.full_name || m.users?.email,
      avatarUrl: m.users?.avatar_url,
      role: m.role,
      locationId: m.location_id,
      locationName: m.locations?.name,
      isActive: m.is_active,
      createdAt: m.created_at
    }));

    return res.status(200).json({ success: true, data: members });
  } catch (error: any) {
    console.error('Organization members GET error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// PATCH /api/organizations/members - Update member
router.patch('/members', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;
  const { memberId, role, locationId, isActive } = req.body;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!memberId) {
    return res.status(400).json({ error: 'Missing memberId' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const userOrg = await getUserOrganization(clerkUserId);
    if (!userOrg || !userOrg.organizationId) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user is owner/admin
    const { data: currentMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', userOrg.organizationId)
      .eq('user_id', userOrg.supabaseUserId)
      .single();

    if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
      return res.status(403).json({ error: 'Not authorized to update members' });
    }

    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (locationId !== undefined) updates.location_id = locationId;
    if (isActive !== undefined) updates.is_active = isActive;

    const { data, error } = await supabase
      .from('organization_members')
      .update(updates)
      .eq('id', memberId)
      .eq('organization_id', userOrg.organizationId)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Organization members PATCH error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// DELETE /api/organizations/members - Remove member
router.delete('/members', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;
  const { memberId } = req.body;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!memberId) {
    return res.status(400).json({ error: 'Missing memberId' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const userOrg = await getUserOrganization(clerkUserId);
    if (!userOrg || !userOrg.organizationId) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user is owner/admin
    const { data: currentMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', userOrg.organizationId)
      .eq('user_id', userOrg.supabaseUserId)
      .single();

    if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
      return res.status(403).json({ error: 'Not authorized to remove members' });
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)
      .eq('organization_id', userOrg.organizationId);

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Organization members DELETE error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ============================================
// INVITES ENDPOINTS
// ============================================

// GET /api/organizations/invites - List pending invites
router.get('/invites', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const userOrg = await getUserOrganization(clerkUserId);
    if (!userOrg || !userOrg.organizationId) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const { data, error } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('organization_id', userOrg.organizationId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const invites = (data || []).map((i: any) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      locationId: i.location_id,
      expiresAt: i.expires_at,
      createdAt: i.created_at
    }));

    return res.status(200).json({ success: true, data: invites });
  } catch (error: any) {
    console.error('Organization invites GET error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// POST /api/organizations/invites - Send invite
router.post('/invites', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;
  const { email, role, locationId } = req.body;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!email || !role) {
    return res.status(400).json({ error: 'Missing email or role' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const userOrg = await getUserOrganization(clerkUserId);
    if (!userOrg || !userOrg.organizationId) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user is owner/admin
    const { data: currentMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', userOrg.organizationId)
      .eq('user_id', userOrg.supabaseUserId)
      .single();

    if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
      return res.status(403).json({ error: 'Not authorized to send invites' });
    }

    // Generate invite token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const { data, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: userOrg.organizationId,
        email,
        role,
        location_id: locationId || null,
        invited_by: userOrg.supabaseUserId,
        token,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Generate invite link
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`;

    return res.status(201).json({
      success: true,
      data: {
        id: data.id,
        email: data.email,
        role: data.role,
        locationId: data.location_id,
        expiresAt: data.expires_at,
        createdAt: data.created_at
      },
      inviteLink
    });
  } catch (error: any) {
    console.error('Organization invites POST error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// DELETE /api/organizations/invites - Cancel invite
router.delete('/invites', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;
  const { inviteId } = req.body;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!inviteId) {
    return res.status(400).json({ error: 'Missing inviteId' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const userOrg = await getUserOrganization(clerkUserId);
    if (!userOrg || !userOrg.organizationId) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const { error } = await supabase
      .from('organization_invites')
      .delete()
      .eq('id', inviteId)
      .eq('organization_id', userOrg.organizationId);

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Organization invites DELETE error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

export default router;
