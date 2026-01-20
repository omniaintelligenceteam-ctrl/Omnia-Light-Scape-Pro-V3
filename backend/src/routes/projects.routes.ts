import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

interface ProjectBody {
    name: string;
    generated_image_url?: string;
    prompt_config?: Record<string, any>;
}

// GET /api/projects - Get all projects for a user
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'Missing userId parameter' });
        }

        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        // First get user's internal ID from clerk_user_id
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_user_id', userId)
            .single();

        if (userError || !userData) {
            // User doesn't exist yet, return empty array
            return res.json({ success: true, data: [] });
        }

        // Get all projects for this user
        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', userData.id)
            .order('created_at', { ascending: false });

        if (projectsError) {
            console.error('Error fetching projects:', projectsError);
            return res.status(500).json({ success: false, error: 'Failed to fetch projects' });
        }

        res.json({ success: true, data: projects || [] });
    } catch (err) {
        console.error('Projects GET error:', err);
        res.status(500).json({ success: false, error: 'Failed to get projects' });
    }
});

// POST /api/projects - Create a new project
router.post('/', async (req: Request<{}, {}, ProjectBody>, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const { name, generated_image_url, prompt_config } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'Missing userId parameter' });
        }

        if (!name) {
            return res.status(400).json({ success: false, error: 'Missing project name' });
        }

        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        // First get user's internal ID from clerk_user_id
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_user_id', userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Create the project
        const { data: project, error: createError } = await supabase
            .from('projects')
            .insert({
                user_id: userData.id,
                name,
                generated_image_url: generated_image_url || null,
                prompt_config: prompt_config || {}
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating project:', createError);
            return res.status(500).json({ success: false, error: 'Failed to create project' });
        }

        res.status(201).json({ success: true, data: project });
    } catch (err) {
        console.error('Projects POST error:', err);
        res.status(500).json({ success: false, error: 'Failed to create project' });
    }
});

// PATCH /api/projects/:id - Update a project
router.patch('/:id', async (req: Request<{ id: string }, {}, Partial<ProjectBody>>, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const projectId = req.params.id;
        const { name, prompt_config } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'Missing userId parameter' });
        }

        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        // First get user's internal ID from clerk_user_id
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_user_id', userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Build update object
        const updates: Record<string, any> = {};
        if (name !== undefined) updates.name = name;
        if (prompt_config !== undefined) {
            // Merge with existing prompt_config
            const { data: existingProject } = await supabase
                .from('projects')
                .select('prompt_config')
                .eq('id', projectId)
                .eq('user_id', userData.id)
                .single();

            updates.prompt_config = {
                ...(existingProject?.prompt_config || {}),
                ...prompt_config
            };
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        // Update the project (ensuring it belongs to this user)
        const { data: project, error: updateError } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .eq('user_id', userData.id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating project:', updateError);
            return res.status(500).json({ success: false, error: 'Failed to update project' });
        }

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        res.json({ success: true, data: project });
    } catch (err) {
        console.error('Projects PATCH error:', err);
        res.status(500).json({ success: false, error: 'Failed to update project' });
    }
});

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const projectId = req.params.id;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'Missing userId parameter' });
        }

        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Database not configured' });
        }

        // First get user's internal ID from clerk_user_id
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_user_id', userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Delete the project (ensuring it belongs to this user)
        const { error: deleteError } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId)
            .eq('user_id', userData.id);

        if (deleteError) {
            console.error('Error deleting project:', deleteError);
            return res.status(500).json({ success: false, error: 'Failed to delete project' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Projects DELETE error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
});

export default router;
