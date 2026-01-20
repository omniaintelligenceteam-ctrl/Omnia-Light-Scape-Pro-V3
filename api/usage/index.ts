import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase.js';

const FREE_TRIAL_LIMIT = 25;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    let supabase: SupabaseClient;
    try {
        supabase = getSupabase();
    } catch {
        return res.status(500).json({ error: 'Database not configured' });
    }

    const action = req.query.action as string;

    // Route to appropriate handler based on action
    switch (action) {
        case 'status':
            return handleStatus(req, res, supabase);
        case 'increment':
            return handleIncrement(req, res, supabase);
        case 'can-generate':
            return handleCanGenerate(req, res, supabase);
        default:
            return res.status(400).json({ error: 'Invalid action. Use: status, increment, or can-generate' });
    }
}

// GET /api/usage?action=status&userId=xxx
async function handleStatus(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
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

// POST /api/usage?action=increment
async function handleIncrement(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
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

// POST /api/usage?action=can-generate
async function handleCanGenerate(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
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
