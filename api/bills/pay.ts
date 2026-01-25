import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    const {
      bill_id,
      amount,
      payment_date,
      payment_method,
      reference_number,
      notes,
    } = req.body;

    if (!bill_id || !amount || !payment_date) {
      return res.status(400).json({ error: 'Missing required fields: bill_id, amount, payment_date' });
    }

    // Get the current bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', bill_id)
      .eq('user_id', supabaseUserId)
      .single();

    if (billError || !bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const paymentAmount = Number(amount);
    const newAmountPaid = Number(bill.amount_paid) + paymentAmount;
    const billAmount = Number(bill.amount);
    const newBalanceDue = billAmount - newAmountPaid;

    // Determine new status
    let newStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (newBalanceDue <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    // Record the payment
    const { error: paymentError } = await supabase
      .from('bill_payments')
      .insert({
        user_id: supabaseUserId,
        bill_id,
        amount: paymentAmount,
        payment_date,
        payment_method: payment_method || null,
        reference_number: reference_number || null,
        notes: notes || null,
      });

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      return res.status(500).json({ error: 'Failed to record payment' });
    }

    // Update the bill
    const updateData: Record<string, unknown> = {
      amount_paid: newAmountPaid,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'paid') {
      updateData.paid_date = payment_date;
      updateData.payment_method = payment_method || null;
      updateData.payment_reference = reference_number || null;
    }

    const { data: updatedBill, error: updateError } = await supabase
      .from('bills')
      .update(updateData)
      .eq('id', bill_id)
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
      ...updatedBill,
      vendor_name: updatedBill.vendors?.name || null,
      project_name: updatedBill.projects?.name || null,
      vendors: undefined,
      projects: undefined,
    };

    return res.status(200).json({ success: true, bill: transformedBill });

  } catch (error: unknown) {
    console.error('Bill payment API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: 'Internal server error', message });
  }
}
