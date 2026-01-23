import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// POST /api/auth/sync-user - Sync Clerk user to Supabase
router.post('/sync-user', async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
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
});

export default router;
