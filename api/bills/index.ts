import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId: clerkUserId, billId, vendorId, status } = req.query;

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

    // GET: Fetch bills
    if (req.method === 'GET') {
      let query = supabase
        .from('bills')
        .select(`
          *,
          vendors:vendor_id (name),
          projects:project_id (name)
        `)
        .eq('user_id', supabaseUserId)
        .order('due_date', { ascending: true });

      if (vendorId && typeof vendorId === 'string') {
        query = query.eq('vendor_id', vendorId);
      }

      if (status && typeof status === 'string') {
        query = query.eq('status', status);
      }

      const { data: bills, error: billError } = await query;

      if (billError) {
        console.error('Error fetching bills:', billError);
        return res.status(500).json({ error: 'Failed to fetch bills' });
      }

      // Transform to include vendor_name and project_name
      const transformedBills = (bills || []).map(b => ({
        ...b,
        vendor_name: b.vendors?.name || null,
        project_name: b.projects?.name || null,
        vendors: undefined,
        projects: undefined,
      }));

      return res.status(200).json({ success: true, bills: transformedBills });
    }

    // POST: Create bill
    if (req.method === 'POST') {
      const {
        vendor_id,
        bill_number,
        bill_date,
        due_date,
        amount,
        category,
        description,
        project_id,
        attachment_url,
      } = req.body;

      if (!vendor_id || !bill_date || !due_date || !amount || !category) {
        return res.status(400).json({ error: 'Missing required fields: vendor_id, bill_date, due_date, amount, category' });
      }

      const { data: bill, error: createError } = await supabase
        .from('bills')
        .insert({
          user_id: supabaseUserId,
          vendor_id,
          bill_number: bill_number || null,
          bill_date,
          due_date,
          amount: Number(amount),
          amount_paid: 0,
          status: 'unpaid',
          category,
          description: description || null,
          project_id: project_id || null,
          attachment_url: attachment_url || null,
        })
        .select(`
          *,
          vendors:vendor_id (name),
          projects:project_id (name)
        `)
        .single();

      if (createError) {
        console.error('Error creating bill:', createError);
        return res.status(500).json({ error: 'Failed to create bill' });
      }

      const transformedBill = {
        ...bill,
        vendor_name: bill.vendors?.name || null,
        project_name: bill.projects?.name || null,
        vendors: undefined,
        projects: undefined,
      };

      return res.status(201).json({ success: true, bill: transformedBill });
    }

    // PATCH: Update bill
    if (req.method === 'PATCH') {
      const { id, ...updates } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing bill id' });
      }

      const allowedFields = ['vendor_id', 'bill_number', 'bill_date', 'due_date', 'amount', 'category', 'description', 'project_id', 'attachment_url'];
      const filteredUpdates: Record<string, unknown> = {};

      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }

      filteredUpdates.updated_at = new Date().toISOString();

      const { data: bill, error: updateError } = await supabase
        .from('bills')
        .update(filteredUpdates)
        .eq('id', id)
        .eq('user_id', supabaseUserId)
        .select(`
          *,
          vendors:vendor_id (name),
          projects:project_id (name)
        `)
        .single();

      if (updateError) {
        console.error('Error updating bill:', updateError);
        return res.status(500).json({ error: 'Failed to update bill' });
      }

      const transformedBill = {
        ...bill,
        vendor_name: bill.vendors?.name || null,
        project_name: bill.projects?.name || null,
        vendors: undefined,
        projects: undefined,
      };

      return res.status(200).json({ success: true, bill: transformedBill });
    }

    // DELETE: Delete bill
    if (req.method === 'DELETE') {
      if (!billId || typeof billId !== 'string') {
        return res.status(400).json({ error: 'Missing billId parameter' });
      }

      const { error: deleteError } = await supabase
        .from('bills')
        .delete()
        .eq('id', billId)
        .eq('user_id', supabaseUserId);

      if (deleteError) {
        console.error('Error deleting bill:', deleteError);
        return res.status(500).json({ error: 'Failed to delete bill' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: unknown) {
    console.error('Bills API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: 'Internal server error', message });
  }
}
