import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';
import crypto from 'crypto';

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId: clerkUserId, token } = req.query;

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Public endpoint: Accept invite by token
  if (req.method === 'POST' && token && typeof token === 'string') {
    return handleAcceptInvite(supabase, token, req.body, res);
  }

  // Public endpoint: Get invite details by token
  if (req.method === 'GET' && token && typeof token === 'string') {
    return handleGetInviteByToken(supabase, token, res);
  }

  // All other endpoints require authentication
  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
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
      .select('id, name')
      .eq('owner_user_id', supabaseUserId)
      .single();

    let organizationId: string | null = null;
    let organizationName: string | null = null;
    let userRole: string | null = null;

    if (org) {
      organizationId = org.id;
      organizationName = org.name;
      userRole = 'owner';
    } else {
      const { data: membership } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations (name)
        `)
        .eq('user_id', supabaseUserId)
        .eq('is_active', true)
        .single();

      if (membership) {
        organizationId = membership.organization_id;
        organizationName = (membership.organizations as any)?.name || null;
        userRole = membership.role;
      }
    }

    if (!organizationId) {
      return res.status(404).json({ error: 'User does not belong to an organization' });
    }

    // GET: List pending invites (owner only)
    if (req.method === 'GET') {
      if (userRole !== 'owner') {
        return res.status(403).json({ error: 'Only owner can view invites' });
      }

      const { data: invites, error } = await supabase
        .from('organization_invites')
        .select(`
          id,
          email,
          role,
          location_id,
          invited_by,
          token,
          expires_at,
          accepted_at,
          created_at,
          locations (name),
          users!organization_invites_invited_by_fkey (full_name, email)
        `)
        .eq('organization_id', organizationId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedInvites = (invites || []).map((i: any) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        locationId: i.location_id,
        locationName: i.locations?.name || null,
        invitedBy: i.invited_by,
        invitedByName: i.users?.full_name || i.users?.email,
        token: i.token,
        expiresAt: i.expires_at,
        createdAt: i.created_at
      }));

      return res.status(200).json({ success: true, data: formattedInvites });
    }

    // POST: Create a new invite (owner only)
    if (req.method === 'POST') {
      if (userRole !== 'owner') {
        return res.status(403).json({ error: 'Only owner can send invites' });
      }

      const { email, role, locationId } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      if (!role || !['admin', 'salesperson', 'technician', 'lead_technician'].includes(role)) {
        return res.status(400).json({ error: 'Valid role is required' });
      }

      // Check if email is already a member
      const { data: existingMember } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingMember) {
        const { data: isMember } = await supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('user_id', existingMember.id)
          .single();

        if (isMember) {
          return res.status(400).json({ error: 'User is already a member of this organization' });
        }
      }

      // Check for existing pending invite
      const { data: existingInvite } = await supabase
        .from('organization_invites')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingInvite) {
        return res.status(400).json({ error: 'Pending invite already exists for this email' });
      }

      const inviteToken = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Invite expires in 7 days

      const { data: invite, error } = await supabase
        .from('organization_invites')
        .insert({
          organization_id: organizationId,
          email,
          role,
          location_id: locationId || null,
          invited_by: supabaseUserId,
          token: inviteToken,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // TODO: Send email with invite link
      // For now, return the token so it can be shared
      const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${inviteToken}`;

      return res.status(201).json({
        success: true,
        data: invite,
        inviteLink,
        organizationName
      });
    }

    // DELETE: Cancel an invite (owner only)
    if (req.method === 'DELETE') {
      if (userRole !== 'owner') {
        return res.status(403).json({ error: 'Only owner can cancel invites' });
      }

      const { inviteId } = req.body;

      if (!inviteId) {
        return res.status(400).json({ error: 'inviteId is required' });
      }

      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Invite cancelled' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Organization invites API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// Get invite details by token (public)
async function handleGetInviteByToken(supabase: any, token: string, res: VercelResponse) {
  try {
    const { data: invite, error } = await supabase
      .from('organization_invites')
      .select(`
        id,
        email,
        role,
        location_id,
        expires_at,
        accepted_at,
        organizations (name)
      `)
      .eq('token', token)
      .single();

    if (error || !invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.accepted_at) {
      return res.status(400).json({ error: 'Invite already accepted' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invite has expired' });
    }

    return res.status(200).json({
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
        organizationName: (invite.organizations as any)?.name,
        expiresAt: invite.expires_at
      }
    });
  } catch (error: any) {
    console.error('Get invite by token error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Accept invite (authenticated user)
async function handleAcceptInvite(supabase: any, token: string, body: any, res: VercelResponse) {
  const { clerkUserId } = body;

  if (!clerkUserId) {
    return res.status(400).json({ error: 'clerkUserId is required to accept invite' });
  }

  try {
    // Get user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get invite
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.accepted_at) {
      return res.status(400).json({ error: 'Invite already accepted' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invite has expired' });
    }

    // Verify email matches (optional - could allow any authenticated user)
    if (invite.email.toLowerCase() !== userData.email.toLowerCase()) {
      return res.status(403).json({ error: 'Invite email does not match your account' });
    }

    // Check if user is already in an organization
    const { data: existingMembership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .single();

    if (existingMembership) {
      return res.status(400).json({ error: 'You are already a member of an organization' });
    }

    // Add user as organization member
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invite.organization_id,
        user_id: userData.id,
        role: invite.role,
        location_id: invite.location_id,
        invited_by: invite.invited_by,
        invited_at: invite.created_at,
        accepted_at: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (memberError) throw memberError;

    // Mark invite as accepted
    await supabase
      .from('organization_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    return res.status(200).json({
      success: true,
      message: 'Invite accepted successfully',
      data: member
    });

  } catch (error: any) {
    console.error('Accept invite error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
