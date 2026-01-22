import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, messageIds } = req.body;

  if (!token || !messageIds || !Array.isArray(messageIds)) {
    return res.status(400).json({ error: 'Missing required fields: token, messageIds (array)' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Validate portal token
    const { data: tokenData, error: tokenError } = await supabase
      .from('portal_tokens')
      .select('client_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const clientId = tokenData.client_id;

    // Mark messages as read (only company messages sent to this client)
    const { error: updateError } = await supabase
      .from('client_messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', messageIds)
      .eq('client_id', clientId)
      .eq('sender_type', 'company')
      .is('read_at', null); // Only update if not already read

    if (updateError) {
      console.error('Mark read error:', updateError);
      return res.status(500).json({ error: 'Failed to mark messages as read' });
    }

    return res.status(200).json({
      success: true
    });

  } catch (error: any) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
