import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId: clerkUserId, type, expenseId, startDate, endDate, category, projectId } = req.query;

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

    // GET: Fetch expenses or categories
    if (req.method === 'GET') {
      // If requesting categories
      if (type === 'categories') {
        const { data: categories, error: catError } = await supabase
          .from('chart_of_accounts')
          .select('id, code, name, type, description')
          .or(`user_id.is.null,user_id.eq.${supabaseUserId}`)
          .in('type', ['cogs', 'expense'])
          .eq('is_active', true)
          .order('code');

        if (catError) {
          console.error('Error fetching categories:', catError);
          return res.status(500).json({ error: 'Failed to fetch categories' });
        }

        return res.status(200).json({ success: true, categories: categories || [] });
      }

      // Fetch expenses with optional filters
      let query = supabase
        .from('expenses')
        .select(`
          *,
          projects:project_id (name)
        `)
        .eq('user_id', supabaseUserId)
        .order('date', { ascending: false });

      if (startDate && typeof startDate === 'string') {
        query = query.gte('date', startDate);
      }
      if (endDate && typeof endDate === 'string') {
        query = query.lte('date', endDate);
      }
      if (category && typeof category === 'string') {
        query = query.eq('category', category);
      }
      if (projectId && typeof projectId === 'string') {
        query = query.eq('project_id', projectId);
      }

      const { data: expenses, error: expError } = await query;

      if (expError) {
        console.error('Error fetching expenses:', expError);
        return res.status(500).json({ error: 'Failed to fetch expenses' });
      }

      // Transform to include project_name
      const transformedExpenses = (expenses || []).map(e => ({
        ...e,
        project_name: e.projects?.name || null,
        projects: undefined
      }));

      return res.status(200).json({ success: true, expenses: transformedExpenses });
    }

    // POST: Create expense
    if (req.method === 'POST') {
      const {
        project_id,
        category: expCategory,
        vendor,
        description,
        amount,
        date,
        receipt_url,
        payment_method = 'card',
        is_billable = false
      } = req.body;

      if (!expCategory || !amount || !date) {
        return res.status(400).json({ error: 'Missing required fields: category, amount, date' });
      }

      const { data: expense, error: createError } = await supabase
        .from('expenses')
        .insert({
          user_id: supabaseUserId,
          project_id: project_id || null,
          category: expCategory,
          vendor: vendor || null,
          description: description || null,
          amount: Number(amount),
          date,
          receipt_url: receipt_url || null,
          payment_method,
          is_billable
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating expense:', createError);
        return res.status(500).json({ error: 'Failed to create expense' });
      }

      return res.status(201).json({ success: true, expense });
    }

    // PATCH: Update expense
    if (req.method === 'PATCH') {
      const { id, ...updates } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing expense id' });
      }

      // Only allow certain fields to be updated
      const allowedFields = ['project_id', 'category', 'vendor', 'description', 'amount', 'date', 'receipt_url', 'payment_method', 'is_billable'];
      const filteredUpdates: Record<string, unknown> = {};

      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }

      const { data: expense, error: updateError } = await supabase
        .from('expenses')
        .update(filteredUpdates)
        .eq('id', id)
        .eq('user_id', supabaseUserId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating expense:', updateError);
        return res.status(500).json({ error: 'Failed to update expense' });
      }

      return res.status(200).json({ success: true, expense });
    }

    // DELETE: Delete expense
    if (req.method === 'DELETE') {
      if (!expenseId || typeof expenseId !== 'string') {
        return res.status(400).json({ error: 'Missing expenseId parameter' });
      }

      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('user_id', supabaseUserId);

      if (deleteError) {
        console.error('Error deleting expense:', deleteError);
        return res.status(500).json({ error: 'Failed to delete expense' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: unknown) {
    console.error('Expenses API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: 'Internal server error', message });
  }
}
