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

        // Get user
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
        let reason = '';

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
                reason = canGenerate ? '' : 'MONTHLY_LIMIT_REACHED';
            } else {
                // No limit set
                remainingFreeGenerations = Math.max(0, FREE_TRIAL_LIMIT - generationCount);
                canGenerate = remainingFreeGenerations > 0;
                reason = canGenerate ? '' : 'FREE_TRIAL_EXHAUSTED';
            }
        } else {
            // No subscription, use free trial
            remainingFreeGenerations = Math.max(0, FREE_TRIAL_LIMIT - generationCount);
            canGenerate = remainingFreeGenerations > 0;
            reason = canGenerate ? '' : 'FREE_TRIAL_EXHAUSTED';
        }

        if (!canGenerate) {
            return res.status(403).json({
                canGenerate: false,
                reason,
                message: reason === 'MONTHLY_LIMIT_REACHED'
                    ? 'Monthly generation limit reached. Upgrade or wait for next billing cycle.'
                    : 'Free trial exhausted. Please subscribe to continue.',
                generationCount,
                freeTrialLimit: FREE_TRIAL_LIMIT,
                monthlyLimit: subData?.monthly_limit || 0
            });
        }

        res.json({
            canGenerate: true,
            hasActiveSubscription,
            generationCount,
            remainingFreeGenerations,
            monthlyLimit: subData?.monthly_limit || 0
        });
    } catch (err) {
        console.error('Can generate check error:', err);
        res.status(500).json({ error: 'Failed to check generation status' });
    }
}
