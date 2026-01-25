import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId: clerkUserId, vendorId } = req.query;

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

    // GET: Fetch vendors
    if (req.method === 'GET') {
      const { data: vendors, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', supabaseUserId)
        .order('name');

      if (vendorError) {
        console.error('Error fetching vendors:', vendorError);
        return res.status(500).json({ error: 'Failed to fetch vendors' });
      }

      return res.status(200).json({ success: true, vendors: vendors || [] });
    }

    // POST: Create vendor
    if (req.method === 'POST') {
      const {
        name,
        email,
        phone,
        address,
        website,
        payment_terms = 'net30',
        account_number,
        default_category,
        notes,
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Vendor name is required' });
      }

      const { data: vendor, error: createError } = await supabase
        .from('vendors')
        .insert({
          user_id: supabaseUserId,
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          website: website || null,
          payment_terms,
          account_number: account_number || null,
          default_category: default_category || null,
          notes: notes || null,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating vendor:', createError);
        return res.status(500).json({ error: 'Failed to create vendor' });
      }

      return res.status(201).json({ success: true, vendor });
    }

    // PATCH: Update vendor
    if (req.method === 'PATCH') {
      const { id, ...updates } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing vendor id' });
      }

      const allowedFields = ['name', 'email', 'phone', 'address', 'website', 'payment_terms', 'account_number', 'default_category', 'notes', 'is_active'];
      const filteredUpdates: Record<string, unknown> = {};

      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }

      filteredUpdates.updated_at = new Date().toISOString();

      const { data: vendor, error: updateError } = await supabase
        .from('vendors')
        .update(filteredUpdates)
        .eq('id', id)
        .eq('user_id', supabaseUserId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating vendor:', updateError);
        return res.status(500).json({ error: 'Failed to update vendor' });
      }

      return res.status(200).json({ success: true, vendor });
    }

    // DELETE: Delete vendor
    if (req.method === 'DELETE') {
      if (!vendorId || typeof vendorId !== 'string') {
        return res.status(400).json({ error: 'Missing vendorId parameter' });
      }

      const { error: deleteError } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId)
        .eq('user_id', supabaseUserId);

      if (deleteError) {
        console.error('Error deleting vendor:', deleteError);
        return res.status(500).json({ error: 'Failed to delete vendor' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: unknown) {
    console.error('Vendors API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: 'Internal server error', message });
  }
}
