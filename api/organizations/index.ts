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

    // GET: Get the user's organization (either owned or member of)
    if (req.method === 'GET') {
      // First check if user owns an organization
      const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_user_id', supabaseUserId)
        .single();

      if (ownedOrg) {
        return res.status(200).json({
          success: true,
          data: ownedOrg,
          role: 'owner'
        });
      }

      // If not owner, check if they're a member of an organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select(`
          role,
          location_id,
          is_active,
          organizations (*)
        `)
        .eq('user_id', supabaseUserId)
        .eq('is_active', true)
        .single();

      if (membership && membership.organizations) {
        return res.status(200).json({
          success: true,
          data: membership.organizations,
          role: membership.role,
          locationId: membership.location_id
        });
      }

      // User has no organization
      return res.status(200).json({ success: true, data: null, role: null });
    }

    // POST: Create a new organization (user becomes owner)
    if (req.method === 'POST') {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Organization name is required' });
      }

      // Check if user already has/belongs to an organization
      const { data: existingOwned } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_user_id', supabaseUserId)
        .single();

      if (existingOwned) {
        return res.status(400).json({ error: 'User already owns an organization' });
      }

      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', supabaseUserId)
        .eq('is_active', true)
        .single();

      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member of an organization' });
      }

      // Create the organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          owner_user_id: supabaseUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add owner as a member too for consistent querying
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: supabaseUserId,
          role: 'owner',
          location_id: null, // Owner has access to all locations
          invited_by: supabaseUserId,
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
          is_active: true,
          created_at: new Date().toISOString()
        });

      if (memberError) {
        // Rollback organization creation
        await supabase.from('organizations').delete().eq('id', org.id);
        throw memberError;
      }

      return res.status(201).json({ success: true, data: org, role: 'owner' });
    }

    // PATCH: Update organization details (owner only)
    if (req.method === 'PATCH') {
      const { name, stripe_customer_id } = req.body;

      // Verify user is owner
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_user_id', supabaseUserId)
        .single();

      if (orgError || !org) {
        return res.status(403).json({ error: 'Only organization owner can update' });
      }

      const updates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (name) updates.name = name;
      if (stripe_customer_id) updates.stripe_customer_id = stripe_customer_id;

      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', org.id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Organizations API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
