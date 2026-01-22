import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId: clerkUserId, id: projectId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Missing project id parameter' });
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

    // Verify project belongs to this organization
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organization_id')
      .eq('id', projectId)
      .eq('organization_id', organizationId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // GET: List assignments for this project
    if (req.method === 'GET') {
      const { data: assignments, error } = await supabase
        .from('project_assignments')
        .select(`
          id,
          project_id,
          user_id,
          role,
          assigned_by,
          assigned_at,
          users!project_assignments_user_id_fkey (
            id,
            email,
            full_name
          ),
          assigner:users!project_assignments_assigned_by_fkey (
            full_name
          )
        `)
        .eq('project_id', projectId)
        .order('assigned_at', { ascending: true });

      if (error) throw error;

      const formattedAssignments = (assignments || []).map((a: any) => ({
        id: a.id,
        projectId: a.project_id,
        userId: a.user_id,
        role: a.role,
        assignedBy: a.assigned_by,
        assignedByName: a.assigner?.full_name,
        assignedAt: a.assigned_at,
        userName: a.users?.full_name || a.users?.email || 'Unknown',
        userEmail: a.users?.email
      }));

      return res.status(200).json({ success: true, data: formattedAssignments });
    }

    // POST: Add assignment (owner/admin only)
    if (req.method === 'POST') {
      if (userRole !== 'owner' && userRole !== 'admin' && userRole !== 'lead_technician') {
        return res.status(403).json({ error: 'Not authorized to assign users' });
      }

      const { userId: assignUserId, role } = req.body;

      if (!assignUserId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      if (!role || !['owner', 'salesperson', 'technician'].includes(role)) {
        return res.status(400).json({ error: 'Valid role is required (owner, salesperson, technician)' });
      }

      // Lead technicians can only assign technicians
      if (userRole === 'lead_technician' && role !== 'technician') {
        return res.status(403).json({ error: 'Lead technicians can only assign technicians' });
      }

      // Verify target user is in the same organization
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

      // Check for existing assignment
      const { data: existingAssignment } = await supabase
        .from('project_assignments')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', assignUserId)
        .single();

      if (existingAssignment) {
        return res.status(400).json({ error: 'User is already assigned to this project' });
      }

      const { data: assignment, error } = await supabase
        .from('project_assignments')
        .insert({
          project_id: projectId,
          user_id: assignUserId,
          role,
          assigned_by: supabaseUserId,
          assigned_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, data: assignment });
    }

    // DELETE: Remove assignment (owner/admin only)
    if (req.method === 'DELETE') {
      if (userRole !== 'owner' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Only owner or admin can remove assignments' });
      }

      const { assignmentId, userId: removeUserId } = req.body;

      // Can delete by assignmentId or userId
      let deleteQuery = supabase
        .from('project_assignments')
        .delete()
        .eq('project_id', projectId);

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
    console.error('Project assignments API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
