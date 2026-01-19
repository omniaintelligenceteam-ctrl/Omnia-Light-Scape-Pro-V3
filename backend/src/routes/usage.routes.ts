import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

const FREE_TRIAL_LIMIT = 10;

interface UsageCheckRequest {
    userId: string;
}

// GET /api/usage/status - Check user's usage status
router.get('/status', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId parameter' });
        }

        if (!supabase) {
            return res.status(500).json({ error: 'Database not configured' });
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
});

// POST /api/usage/increment - Increment generation count (call after successful generation)
router.post('/increment', async (req: Request<{}, {}, UsageCheckRequest>, res: Response) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        if (!supabase) {
            return res.status(500).json({ error: 'Database not configured' });
        }

        // Increment generation count
        const { data: userData, error: updateError } = await supabase
            .from('users')
            .update({
                generation_count: supabase.rpc ? undefined : 0 // Will use RPC below
            })
            .eq('clerk_user_id', userId)
            .select('id, generation_count')
            .single();

        // Use raw SQL to increment
        const { data, error } = await supabase.rpc('increment_generation_count', {
            user_clerk_id: userId
        });

        if (error) {
            // Fallback: manual increment if RPC doesn't exist
            const { data: user } = await supabase
                .from('users')
                .select('id, generation_count')
                .eq('clerk_user_id', userId)
                .single();

            if (user) {
                await supabase
                    .from('users')
                    .update({ generation_count: (user.generation_count || 0) + 1 })
                    .eq('clerk_user_id', userId);
            }
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
});

// POST /api/usage/can-generate - Check if user can generate (and increment if yes)
router.post('/can-generate', async (req: Request<{}, {}, UsageCheckRequest>, res: Response) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        if (!supabase) {
            return res.status(500).json({ error: 'Database not configured' });
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
});

export default router;
