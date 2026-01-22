import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId: clerkUserId, id: clientId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({ error: 'Missing client id parameter' });
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

    // Verify client belongs to this organization
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, organization_id')
      .eq('id', clientId)
      .eq('organization_id', organizationId)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    // GET: List assignments for this client
    if (req.method === 'GET') {
      const { data: assignments, error } = await supabase
        .from('client_assignments')
        .select(`
          id,
          client_id,
          user_id,
          is_primary,
          assigned_at,
          users!client_assignments_user_id_fkey (
            id,
            email,
            full_name
          )
        `)
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false })
        .order('assigned_at', { ascending: true });

      if (error) throw error;

      const formattedAssignments = (assignments || []).map((a: any) => ({
        id: a.id,
        clientId: a.client_id,
        userId: a.user_id,
        isPrimary: a.is_primary,
        assignedAt: a.assigned_at,
        userName: a.users?.full_name || a.users?.email || 'Unknown',
        userEmail: a.users?.email
      }));

      return res.status(200).json({ success: true, data: formattedAssignments });
    }

    // POST: Add assignment (owner/admin only)
    if (req.method === 'POST') {
      if (userRole !== 'owner' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Only owner or admin can assign salespeople to clients' });
      }

      const { userId: assignUserId, isPrimary } = req.body;

      if (!assignUserId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      // Verify target user is in the same organization and is a salesperson or admin
      const { data: targetMember } = await supabase
        .from('organization_members')
        .select('id, role')
        .eq('organization_id', organizationId)
        .eq('user_id', assignUserId)
        .eq('is_active', true)
        .single();

      if (!targetMember) {
        return res.status(400).json({ error: 'User is not a member of this organization' });
      }

      // Only salespeople and admins can be assigned to clients
      if (!['salesperson', 'admin', 'owner'].includes(targetMember.role)) {
        return res.status(400).json({ error: 'Only salespeople, admins, or owners can be assigned to clients' });
      }

      // Check for existing assignment
      const { data: existingAssignment } = await supabase
        .from('client_assignments')
        .select('id')
        .eq('client_id', clientId)
        .eq('user_id', assignUserId)
        .single();

      if (existingAssignment) {
        return res.status(400).json({ error: 'User is already assigned to this client' });
      }

      // If setting as primary, unset other primaries
      if (isPrimary) {
        await supabase
          .from('client_assignments')
          .update({ is_primary: false })
          .eq('client_id', clientId)
          .eq('is_primary', true);
      }

      const { data: assignment, error } = await supabase
        .from('client_assignments')
        .insert({
          client_id: clientId,
          user_id: assignUserId,
          is_primary: isPrimary || false,
          assigned_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, data: assignment });
    }

    // PATCH: Update assignment (set primary)
    if (req.method === 'PATCH') {
      if (userRole !== 'owner' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Only owner or admin can update assignments' });
      }

      const { assignmentId, isPrimary } = req.body;

      if (!assignmentId) {
        return res.status(400).json({ error: 'assignmentId is required' });
      }

      // If setting as primary, unset other primaries
      if (isPrimary) {
        await supabase
          .from('client_assignments')
          .update({ is_primary: false })
          .eq('client_id', clientId)
          .eq('is_primary', true);
      }

      const { data, error } = await supabase
        .from('client_assignments')
        .update({ is_primary: isPrimary })
        .eq('id', assignmentId)
        .eq('client_id', clientId)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    // DELETE: Remove assignment (owner/admin only)
    if (req.method === 'DELETE') {
      if (userRole !== 'owner' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Only owner or admin can remove assignments' });
      }

      const { assignmentId, userId: removeUserId } = req.body;

      let deleteQuery = supabase
        .from('client_assignments')
        .delete()
        .eq('client_id', clientId);

      if (assignmentId) {
        deleteQuery = deleteQuery.eq('id', assignmentId);
      } else if (removeUserId) {
        deleteQuery = deleteQuery.eq('user_id', removeUserId);
      } else {
        return res.status(400).json({ error: 'assignmentId or userId is required' });
      }

      const { error } = await deleteQuery;

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Assignment removed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Client assignments API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
