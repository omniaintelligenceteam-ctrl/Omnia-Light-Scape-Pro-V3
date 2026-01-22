import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, messageText, senderName } = req.body;

  if (!token || !messageText || !senderName) {
    return res.status(400).json({ error: 'Missing required fields: token, messageText, senderName' });
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

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('client_messages')
      .insert({
        client_id: clientId,
        sender_type: 'client',
        sender_name: senderName,
        message_text: messageText
      })
      .select()
      .single();

    if (insertError) {
      console.error('Message insert error:', insertError);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    // TODO: Send email notification to company
    // This would integrate with Resend or similar email service

    return res.status(200).json({
      success: true,
      data: message
    });

  } catch (error: any) {
    console.error('Send message error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
