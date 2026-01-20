import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { uploadImage } from '../services/uploadService';
import { SavedProject, QuoteData, BOMData, ProjectStatus } from '../types';

export function useProjects() {
  const { user } = useUser();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load projects from API on mount
  useEffect(() => {
    async function loadProjects() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/projects?userId=${user.id}`);

        if (!response.ok) {
          throw new Error('Failed to load projects');
        }

        const data = await response.json();

        if (data.success && data.data) {
          const loadedProjects: SavedProject[] = data.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            date: new Date(p.created_at).toLocaleDateString(),
            image: p.generated_image_url,
            quote: p.prompt_config?.quote || null,
            bom: p.prompt_config?.bom || null,
            status: (p.prompt_config?.status as ProjectStatus) || 'draft'
          }));
          setProjects(loadedProjects);
        }
      } catch (err: any) {
        console.error('Error loading projects:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadProjects();
  }, [user]);

  // Save a new project
  const saveProject = useCallback(async (
    name: string,
    generatedImage: string,
    quote: QuoteData | null = null,
    bom: BOMData | null = null
  ): Promise<SavedProject | null> => {
    if (!user) {
      setError('User not logged in');
      return null;
    }

    try {
      console.log('Saving project...', { name, userId: user.id, hasImage: !!generatedImage, hasBOM: !!bom });

      let imageUrl = '';

      // Upload image directly to Supabase Storage from browser
      if (generatedImage && generatedImage.startsWith('data:')) {
        console.log('Uploading image to storage...');
        imageUrl = await uploadImage(generatedImage, user.id);
        console.log('Image uploaded:', imageUrl);
      } else if (generatedImage) {
        imageUrl = generatedImage;
      }

      // Build prompt_config object with all available data
      const promptConfig: Record<string, any> = { savedFromEditor: true };
      if (quote) promptConfig.quote = quote;
      if (bom) promptConfig.bom = bom;

      const response = await fetch(`/api/projects?userId=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          generated_image_url: imageUrl,
          prompt_config: promptConfig
        }),
      });

      console.log('Save response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save failed:', response.status, errorText);
        throw new Error(`Failed to save project: ${response.status}`);
      }

      const data = await response.json();
      console.log('Save response data:', data);

      if (data.success && data.data) {
        const newProject: SavedProject = {
          id: data.data.id,
          name: data.data.name,
          date: new Date(data.data.created_at).toLocaleDateString(),
          image: data.data.generated_image_url,
          quote: data.data.prompt_config?.quote || null,
          bom: data.data.prompt_config?.bom || null,
          status: 'draft'
        };

        setProjects(prev => [newProject, ...prev]);
        return newProject;
      }

      return null;
    } catch (err: any) {
      console.error('Error saving project:', err);
      setError(err.message);
      return null;
    }
  }, [user]);

  // Delete a project
  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    if (!user) {
      setError('User not logged in');
      return false;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      setProjects(prev => prev.filter(p => p.id !== projectId));
      return true;
    } catch (err: any) {
      console.error('Error deleting project:', err);
      setError(err.message);
      return false;
    }
  }, [user]);

  // Update a project
  const updateProject = useCallback(async (
    projectId: string,
    updates: { name?: string; quote?: QuoteData; bom?: BOMData; status?: ProjectStatus }
  ): Promise<boolean> => {
    if (!user) {
      setError('User not logged in');
      return false;
    }

    try {
      // Get current project to merge prompt_config
      const currentProject = projects.find(p => p.id === projectId);
      const promptConfig: Record<string, any> = {};
      if (updates.quote) promptConfig.quote = updates.quote;
      if (updates.bom) promptConfig.bom = updates.bom;
      if (updates.status) promptConfig.status = updates.status;

      const response = await fetch(`/api/projects/${projectId}?userId=${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updates.name,
          prompt_config: Object.keys(promptConfig).length > 0 ? promptConfig : undefined
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            name: updates.name || p.name,
            quote: updates.quote || p.quote,
            bom: updates.bom || p.bom,
            status: updates.status || p.status
          };
        }
        return p;
      }));

      return true;
    } catch (err: any) {
      console.error('Error updating project:', err);
      setError(err.message);
      return false;
    }
  }, [user, projects]);

  // Update project status
  const updateProjectStatus = useCallback(async (
    projectId: string,
    status: ProjectStatus
  ): Promise<boolean> => {
    return updateProject(projectId, { status });
  }, [updateProject]);

  return {
    projects,
    isLoading,
    error,
    saveProject,
    deleteProject,
    updateProject,
    updateProjectStatus,
    setProjects
  };
}
