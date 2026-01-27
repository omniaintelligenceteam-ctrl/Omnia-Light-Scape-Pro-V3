import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

const FREE_TRIAL_LIMIT = 10;

interface UsageCheckRequest {
    userId: string;
}

// Handler function for status check
async function handleStatus(req: Request, res: Response) {
    try {
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId parameter' });
        }

        // Return mock data if supabase is not available (local dev)
        if (!supabase) {
            return res.json({
                hasActiveSubscription: false,
                generationCount: 0,
                freeTrialLimit: FREE_TRIAL_LIMIT,
                remainingFreeGenerations: FREE_TRIAL_LIMIT,
                canGenerate: true,
                plan: null,
                monthlyLimit: 0
            });
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

// Query-param based routing (for frontend compatibility)
// Handles: /api/usage?action=status, /api/usage?action=increment, /api/usage?action=can-generate
router.get('/', async (req: Request, res: Response) => {
    const action = req.query.action as string;

    if (action === 'status') {
        return handleStatus(req, res);
    }

    return res.status(400).json({ error: 'Invalid action for GET. Use: status' });
});

router.post('/', async (req: Request, res: Response) => {
    const action = req.query.action as string;

    if (action === 'increment') {
        return handleIncrement(req, res);
    }
    if (action === 'can-generate') {
        return handleCanGenerate(req, res);
    }

    return res.status(400).json({ error: 'Invalid action for POST. Use: increment or can-generate' });
});

// Handler function for increment
async function handleIncrement(req: Request, res: Response) {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        // Return mock data if supabase is not available (local dev)
        if (!supabase) {
            return res.json({
                generationCount: 1,
                remainingFreeGenerations: FREE_TRIAL_LIMIT - 1,
                hasActiveSubscription: false
            });
        }

        // Try RPC first, then fallback to manual increment
        const { error: rpcError } = await supabase.rpc('increment_generation_count', {
            user_clerk_id: userId
        });

        if (rpcError) {
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
}

// Handler function for can-generate check
async function handleCanGenerate(req: Request, res: Response) {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        // Return mock data if supabase is not available (local dev)
        if (!supabase) {
            return res.json({
                canGenerate: true,
                hasActiveSubscription: false,
                generationCount: 0,
                remainingFreeGenerations: FREE_TRIAL_LIMIT,
                monthlyLimit: 0
            });
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

// GET /api/usage/status - Check user's usage status (path-based routing)
router.get('/status', handleStatus);

// POST /api/usage/increment - Increment generation count (path-based routing)
router.post('/increment', handleIncrement);

// POST /api/usage/can-generate - Check if user can generate (path-based routing)
router.post('/can-generate', handleCanGenerate);

export default router;
