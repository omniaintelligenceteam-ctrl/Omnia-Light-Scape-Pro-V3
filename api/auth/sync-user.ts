import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clerkUserId, email } = req.body;

    if (!clerkUserId || !email) {
      return res.status(400).json({ error: 'Missing clerkUserId or email' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (existingUser) {
      // User already exists, return success
      return res.status(200).json({
        success: true,
        message: 'User already exists',
        userId: existingUser.id
      });
    }

    // Create new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        clerk_user_id: clerkUserId,
        email: email,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    return res.status(201).json({
      success: true,
      message: 'User created',
      userId: newUser.id
    });

  } catch (error: any) {
    console.error('Sync user error:', error);
    return res.status(500).json({ error: error.message });
  }
}
