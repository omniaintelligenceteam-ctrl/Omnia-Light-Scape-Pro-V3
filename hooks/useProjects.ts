import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { SavedProject, QuoteData } from '../types';

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
          // Transform API data to match SavedProject format
          const loadedProjects: SavedProject[] = data.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            date: new Date(p.created_at).toLocaleDateString(),
            image: p.generated_image_url,
            quote: p.prompt_config?.quote || null
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
    quote: QuoteData | null = null
  ): Promise<SavedProject | null> => {
    if (!user) {
      setError('User not logged in');
      return null;
    }

    try {
      const response = await fetch(`/api/projects?userId=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          generated_image_url: generatedImage,
          prompt_config: quote ? { quote } : { savedFromEditor: true }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save project');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const newProject: SavedProject = {
          id: data.data.id,
          name: data.data.name,
          date: new Date(data.data.created_at).toLocaleDateString(),
          image: data.data.generated_image_url,
          quote: data.data.prompt_config?.quote || null
        };

        // Add to local state
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

      // Remove from local state
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
    updates: { name?: string; quote?: QuoteData }
  ): Promise<boolean> => {
    if (!user) {
      setError('User not logged in');
      return false;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}?userId=${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updates.name,
          prompt_config: updates.quote ? { quote: updates.quote } : undefined
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      // Update local state
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            name: updates.name || p.name,
            quote: updates.quote || p.quote
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
  }, [user]);

  return {
    projects,
    isLoading,
    error,
    saveProject,
    deleteProject,
    updateProject,
    setProjects // For local state updates if needed
  };
}
