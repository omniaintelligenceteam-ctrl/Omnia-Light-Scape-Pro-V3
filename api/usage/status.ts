import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase.js';

const FREE_TRIAL_LIMIT = 25;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId parameter' });
        }

        // Get user's generation count
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, generation_count')
            .eq('clerk_user_id', userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check for active subscription
        const { data: subData } = await supabase
            .from('subscriptions')
            .select('status, plan_id, monthly_limit')
            .eq('user_id', userData.id)
            .eq('status', 'active')
            .single();

        const hasActiveSubscription = !!subData;
        const generationCount = userData.generation_count || 0;

        let remainingFreeGenerations = 0;
        let canGenerate = false;

        if (hasActiveSubscription) {
            const monthlyLimit = subData.monthly_limit || 0;
            if (monthlyLimit === -1) {
                // Unlimited
                remainingFreeGenerations = 999999;
                canGenerate = true;
            } else if (monthlyLimit > 0) {
                // Has a monthly limit
                remainingFreeGenerations = Math.max(0, monthlyLimit - generationCount);
                canGenerate = remainingFreeGenerations > 0;
            } else {
                // No limit set, default to free trial
                remainingFreeGenerations = Math.max(0, FREE_TRIAL_LIMIT - generationCount);
                canGenerate = remainingFreeGenerations > 0;
            }
        } else {
            // No subscription, use free trial
            remainingFreeGenerations = Math.max(0, FREE_TRIAL_LIMIT - generationCount);
            canGenerate = remainingFreeGenerations > 0;
        }

        res.json({
            hasActiveSubscription,
            generationCount,
            freeTrialLimit: FREE_TRIAL_LIMIT,
            remainingFreeGenerations,
            canGenerate,
            plan: subData?.plan_id || null,
            monthlyLimit: subData?.monthly_limit || 0
        });
    } catch (err) {
        console.error('Usage status error:', err);
        res.status(500).json({ error: 'Failed to get usage status' });
    }
}
