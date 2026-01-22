import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { uploadImage } from '../services/uploadService';
import { SavedProject, QuoteData, BOMData, ProjectStatus, ScheduleData, ProjectImage } from '../types';

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
            images: p.prompt_config?.images || undefined,
            quote: p.prompt_config?.quote || null,
            bom: p.prompt_config?.bom || null,
            status: (p.prompt_config?.status as ProjectStatus) || 'draft',
            schedule: p.prompt_config?.schedule || undefined,
            invoicePaidAt: p.invoice_paid_at || undefined,
            clientId: p.client_id || undefined,
            clientName: p.prompt_config?.clientName || undefined
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
    bom: BOMData | null = null,
    clientId?: string,
    clientName?: string
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
      if (clientName) promptConfig.clientName = clientName;

      const response = await fetch(`/api/projects?userId=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          generated_image_url: imageUrl,
          prompt_config: promptConfig,
          client_id: clientId || null
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
          images: data.data.prompt_config?.images || undefined,
          quote: data.data.prompt_config?.quote || null,
          bom: data.data.prompt_config?.bom || null,
          status: 'draft',
          clientId: data.data.client_id || undefined,
          clientName: data.data.prompt_config?.clientName || undefined
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
    updates: { name?: string; quote?: QuoteData; bom?: BOMData; status?: ProjectStatus; schedule?: ScheduleData; images?: ProjectImage[]; assignedTo?: string[]; assignedTechnicianId?: string }
  ): Promise<boolean> => {
    if (!user) {
      setError('User not logged in');
      return false;
    }

    try {
      // Get current project to merge prompt_config (API replaces entire JSONB, so we must include existing data)
      const currentProject = projects.find(p => p.id === projectId);

      // Build merged prompt_config - start with existing data
      const promptConfig: Record<string, any> = {};

      // Preserve existing data from current project
      if (currentProject?.quote) promptConfig.quote = currentProject.quote;
      if (currentProject?.bom) promptConfig.bom = currentProject.bom;
      if (currentProject?.status) promptConfig.status = currentProject.status;
      if (currentProject?.schedule) promptConfig.schedule = currentProject.schedule;
      if (currentProject?.images) promptConfig.images = currentProject.images;
      if (currentProject?.assignedTo) promptConfig.assignedTo = currentProject.assignedTo;
      if (currentProject?.assignedTechnicianId) promptConfig.assignedTechnicianId = currentProject.assignedTechnicianId;

      // Apply updates (overwrite specific fields)
      if (updates.quote !== undefined) promptConfig.quote = updates.quote;
      if (updates.bom !== undefined) promptConfig.bom = updates.bom;
      if (updates.status !== undefined) promptConfig.status = updates.status;
      if (updates.schedule !== undefined) promptConfig.schedule = updates.schedule;
      if (updates.images !== undefined) promptConfig.images = updates.images;
      if (updates.assignedTo !== undefined) promptConfig.assignedTo = updates.assignedTo;
      if (updates.assignedTechnicianId !== undefined) promptConfig.assignedTechnicianId = updates.assignedTechnicianId;

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
        const errorText = await response.text();
        console.error('Update failed:', response.status, errorText);
        throw new Error('Failed to update project');
      }

      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            name: updates.name || p.name,
            quote: updates.quote !== undefined ? updates.quote : p.quote,
            bom: updates.bom !== undefined ? updates.bom : p.bom,
            status: updates.status !== undefined ? updates.status : p.status,
            schedule: updates.schedule !== undefined ? updates.schedule : p.schedule,
            images: updates.images !== undefined ? updates.images : p.images
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

  // Schedule a project
  const scheduleProject = useCallback(async (
    projectId: string,
    schedule: ScheduleData
  ): Promise<boolean> => {
    return updateProject(projectId, { status: 'scheduled', schedule });
  }, [updateProject]);

  // Complete a project
  const completeProject = useCallback(async (
    projectId: string,
    completionNotes?: string
  ): Promise<boolean> => {
    const project = projects.find(p => p.id === projectId);
    if (!project?.schedule) return false;

    const updatedSchedule: ScheduleData = {
      ...project.schedule,
      completionNotes
    };
    return updateProject(projectId, { status: 'completed', schedule: updatedSchedule });
  }, [updateProject, projects]);

  // Add image to a project
  const addImageToProject = useCallback(async (
    projectId: string,
    imageDataUrl: string,
    label?: string
  ): Promise<boolean> => {
    if (!user) {
      setError('User not logged in');
      return false;
    }

    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return false;

      // Upload the new image
      let imageUrl = '';
      if (imageDataUrl.startsWith('data:')) {
        imageUrl = await uploadImage(imageDataUrl, user.id);
      } else {
        imageUrl = imageDataUrl;
      }

      // Create new image entry
      const newImage: ProjectImage = {
        id: `img_${Date.now()}`,
        url: imageUrl,
        label: label || `View ${(project.images?.length || 0) + 2}`,
        createdAt: new Date().toISOString()
      };

      // Combine existing images with new one
      const existingImages: ProjectImage[] = project.images || [];

      // If project has primary image but no images array, create one
      if (!project.images && project.image) {
        existingImages.push({
          id: `img_primary`,
          url: project.image,
          label: 'View 1',
          createdAt: project.date
        });
      }

      const updatedImages = [...existingImages, newImage];

      return updateProject(projectId, { images: updatedImages });
    } catch (err: any) {
      console.error('Error adding image to project:', err);
      setError(err.message);
      return false;
    }
  }, [user, projects, updateProject]);

  // Remove image from project
  const removeImageFromProject = useCallback(async (
    projectId: string,
    imageId: string
  ): Promise<boolean> => {
    const project = projects.find(p => p.id === projectId);
    if (!project?.images) return false;

    const updatedImages = project.images.filter(img => img.id !== imageId);
    return updateProject(projectId, { images: updatedImages });
  }, [projects, updateProject]);

  return {
    projects,
    isLoading,
    error,
    saveProject,
    deleteProject,
    updateProject,
    updateProjectStatus,
    scheduleProject,
    completeProject,
    addImageToProject,
    removeImageFromProject,
    setProjects
  };
}
