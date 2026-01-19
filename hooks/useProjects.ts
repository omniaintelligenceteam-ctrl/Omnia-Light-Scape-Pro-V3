import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { SavedProject, QuoteData, BOMData } from '../types';

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
            quote: p.prompt_config?.quote || null,
            bom: p.prompt_config?.bom || null
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

    let imageUrl = generatedImage;

    // If image is base64, upload to storage first
    if (generatedImage && generatedImage.startsWith('data:')) {
      console.log('Uploading image to storage...');
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: generatedImage,
          userId: user.id
        })
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);
        throw new Error('Failed to upload image');
      }

      const uploadData = await uploadResponse.json();
      imageUrl = uploadData.url;
      console.log('Image uploaded:', imageUrl);
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
        bom: data.data.prompt_config?.bom || null
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

