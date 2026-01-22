import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';
import crypto from 'crypto';

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Look up token
    const { data: tokenData, error: tokenError } = await supabase
      .from('client_portal_tokens')
      .select('id, client_id, expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return res.status(404).json({ error: 'Invalid or expired link' });
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This link has expired. Please request a new one.' });
    }

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email, user_id')
      .eq('id', tokenData.client_id)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get company details
    const { data: settings } = await supabase
      .from('settings')
      .select('company_name, company_logo')
      .eq('user_id', client.user_id)
      .single();

    // Generate session token for ongoing authentication
    const sessionToken = generateSessionToken();
    const sessionExpires = new Date();
    sessionExpires.setDate(sessionExpires.getDate() + 7); // 7 day session

    // Mark token as used (but keep it valid for the session)
    if (!tokenData.used_at) {
      await supabase
        .from('client_portal_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id);
    }

    // Update client's last portal access
    await supabase
      .from('clients')
      .update({ last_portal_access: new Date().toISOString() })
      .eq('id', client.id);

    return res.status(200).json({
      success: true,
      data: {
        sessionToken,
        sessionExpires: sessionExpires.toISOString(),
        client: {
          id: client.id,
          name: client.name,
          email: client.email
        },
        company: {
          name: settings?.company_name || 'Your Lighting Company',
          logo: settings?.company_logo || null
        }
      }
    });

  } catch (error: any) {
    console.error('Verify token error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
