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
// BASE ORGANIZATION ENDPOINTS
// ============================================

// GET /api/organizations - Get current user's organization
router.get('/', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!userData) {
      return res.status(200).json({ success: true, data: null, role: null });
    }

    if (!userData.organization_id) {
      return res.status(200).json({ success: true, data: null, role: null });
    }

    // Get organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userData.organization_id)
      .single();

    if (orgError || !orgData) {
      return res.status(200).json({ success: true, data: null, role: null });
    }

    // Get user's role in the organization
    const { data: memberData } = await supabase
      .from('organization_members')
      .select('role, location_id')
      .eq('organization_id', userData.organization_id)
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .single();

    return res.status(200).json({
      success: true,
      data: orgData,
      role: memberData?.role || null,
      locationId: memberData?.location_id || null
    });
  } catch (error: any) {
    console.error('Organization GET error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// POST /api/organizations - Create organization for current user
router.post('/', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;
  const { name } = req.body;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!name) {
    return res.status(400).json({ error: 'Organization name is required' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userData.organization_id) {
      return res.status(400).json({ error: 'User already belongs to an organization' });
    }

    // Create organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        owner_user_id: userData.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Update user with organization_id
    await supabase
      .from('users')
      .update({ organization_id: orgData.id })
      .eq('id', userData.id);

    // Add user as owner member
    await supabase
      .from('organization_members')
      .insert({
        organization_id: orgData.id,
        user_id: userData.id,
        role: 'owner',
        invited_by: userData.id,
        accepted_at: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      });

    return res.status(201).json({
      success: true,
      data: orgData,
      role: 'owner'
    });
  } catch (error: any) {
    console.error('Organization POST error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// PATCH /api/organizations - Update current user's organization
router.patch('/', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;
  const { name, stripe_customer_id } = req.body;

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

    // Check if user is owner
    const { data: orgData } = await supabase
      .from('organizations')
      .select('owner_user_id')
      .eq('id', userOrg.organizationId)
      .single();

    if (!orgData || orgData.owner_user_id !== userOrg.supabaseUserId) {
      return res.status(403).json({ error: 'Not authorized to update organization' });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (stripe_customer_id !== undefined) updates.stripe_customer_id = stripe_customer_id;

    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', userOrg.organizationId)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Organization PATCH error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

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

    // First get members
    const { data: membersData, error: membersError } = await supabase
      .from('organization_members')
      .select('id, user_id, role, location_id, is_active, created_at')
      .eq('organization_id', userOrg.organizationId)
      .order('created_at', { ascending: true });

    if (membersError) throw membersError;

    // Get unique user IDs and location IDs
    const userIds = [...new Set((membersData || []).map(m => m.user_id).filter(Boolean))];
    const locationIds = [...new Set((membersData || []).map(m => m.location_id).filter(Boolean))];

    // Fetch users separately
    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);

      usersMap = (usersData || []).reduce((acc: Record<string, any>, u: any) => {
        acc[u.id] = u;
        return acc;
      }, {});
    }

    // Fetch locations separately
    let locationsMap: Record<string, any> = {};
    if (locationIds.length > 0) {
      const { data: locationsData } = await supabase
        .from('locations')
        .select('id, name')
        .in('id', locationIds);

      locationsMap = (locationsData || []).reduce((acc: Record<string, any>, l: any) => {
        acc[l.id] = l;
        return acc;
      }, {});
    }

    // Transform to expected format
    const members = (membersData || []).map((m: any) => {
      const user = usersMap[m.user_id];
      const location = m.location_id ? locationsMap[m.location_id] : null;
      return {
        id: m.id,
        userId: m.user_id,
        userEmail: user?.email || '',
        userName: user?.full_name || user?.email || 'Unknown',
        avatarUrl: user?.avatar_url || null,
        role: m.role,
        locationId: m.location_id,
        locationName: location?.name || null,
        isActive: m.is_active,
        createdAt: m.created_at
      };
    });

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

    // Generate invite link - prefer APP_URL for production domain
    const inviteLink = `${process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`;

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
