import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase.js';

const FREE_TRIAL_LIMIT = 25;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        // Try RPC first, then fallback to manual increment
        const { error: rpcError } = await supabase.rpc('increment_generation_count', {
            user_clerk_id: userId
        });

        if (rpcError) {
            // Fallback: manual increment if RPC doesn't exist
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('id, generation_count')
                .eq('clerk_user_id', userId)
                .single();

            if (fetchError || !user) {
                return res.status(404).json({ error: 'User not found' });
            }

            await supabase
                .from('users')
                .update({ generation_count: (user.generation_count || 0) + 1 })
                .eq('clerk_user_id', userId);
        }

        // Get updated status
        const { data: updatedUser } = await supabase
            .from('users')
            .select('id, generation_count')
            .eq('clerk_user_id', userId)
            .single();

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check subscription
        const { data: subData } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', updatedUser.id)
            .eq('status', 'active')
            .single();

        const generationCount = updatedUser.generation_count || 0;
        const remainingFreeGenerations = Math.max(0, FREE_TRIAL_LIMIT - generationCount);

        res.json({
            generationCount,
            remainingFreeGenerations,
            hasActiveSubscription: !!subData
        });
    } catch (err) {
        console.error('Usage increment error:', err);
        res.status(500).json({ error: 'Failed to increment usage' });
    }
}
