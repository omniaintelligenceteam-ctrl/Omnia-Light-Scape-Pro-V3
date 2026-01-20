import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Webhook } from 'svix';
import { getSupabase } from '../lib/supabase.js';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!webhookSecret) {
    console.error('Missing CLERK_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Get headers for verification
    const svix_id = req.headers['svix-id'] as string;
    const svix_timestamp = req.headers['svix-timestamp'] as string;
    const svix_signature = req.headers['svix-signature'] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: 'Missing svix headers' });
    }

    // Verify the webhook
    const wh = new Webhook(webhookSecret);
    const payload = wh.verify(JSON.stringify(req.body), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as any;

    const eventType = payload.type;
    const userData = payload.data;

    console.log(`Clerk webhook received: ${eventType}`);

    // Handle user.created event
    if (eventType === 'user.created') {
      const { id, email_addresses, primary_email_address_id } = userData;
      const primaryEmail = email_addresses.find(
        (e: any) => e.id === primary_email_address_id
      );

      if (!primaryEmail) {
        return res.status(400).json({ error: 'No primary email found' });
      }

      // Insert user into Supabase
      const { error } = await supabase.from('users').insert({
        clerk_user_id: id,
        email: primaryEmail.email_address,
      });

      if (error) {
        console.error('Error creating user in Supabase:', error);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      console.log(`User created in Supabase: ${primaryEmail.email_address}`);
    }

    // Handle user.updated event
    if (eventType === 'user.updated') {
      const { id, email_addresses, primary_email_address_id } = userData;
      const primaryEmail = email_addresses.find(
        (e: any) => e.id === primary_email_address_id
      );

      if (primaryEmail) {
        const { error } = await supabase
          .from('users')
          .update({ email: primaryEmail.email_address })
          .eq('clerk_user_id', id);

        if (error) {
          console.error('Error updating user in Supabase:', error);
        } else {
          console.log(`User updated in Supabase: ${primaryEmail.email_address}`);
        }
      }
    }

    // Handle user.deleted event
    if (eventType === 'user.deleted') {
      const { id } = userData;

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('clerk_user_id', id);

      if (error) {
        console.error('Error deleting user from Supabase:', error);
      } else {
        console.log(`User deleted from Supabase: ${id}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(400).json({ error: error.message });
  }
}
