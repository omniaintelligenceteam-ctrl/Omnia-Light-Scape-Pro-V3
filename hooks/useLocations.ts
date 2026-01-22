import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Location } from '../types';

interface UseLocationsResult {
  locations: Location[];
  isLoading: boolean;
  error: string | null;
  createLocation: (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Location | null>;
  updateLocation: (id: string, updates: Partial<Location>) => Promise<Location | null>;
  deleteLocation: (id: string) => Promise<boolean>;
  getLocation: (id: string) => Location | undefined;
  activeLocations: Location[];
  refetch: () => Promise<void>;
}

export function useLocations(): UseLocationsResult {
  const { user } = useUser();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    if (!user?.id) {
      setLocations([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/locations?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Transform snake_case to camelCase
        const transformedLocations: Location[] = data.data.map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          address: loc.address,
          managerName: loc.manager_name,
          managerEmail: loc.manager_email,
          isActive: loc.is_active,
          createdAt: loc.created_at,
          updatedAt: loc.updated_at
        }));
        setLocations(transformedLocations);
      }
    } catch (err: any) {
      console.error('Error fetching locations:', err);
      setError(err.message || 'Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const createLocation = async (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Promise<Location | null> => {
    if (!user?.id) return null;

    try {
      const response = await fetch(`/api/locations?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: location.name,
          address: location.address,
          manager_name: location.managerName,
          manager_email: location.managerEmail,
          is_active: location.isActive
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create location');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const newLocation: Location = {
          id: data.data.id,
          name: data.data.name,
          address: data.data.address,
          managerName: data.data.manager_name,
          managerEmail: data.data.manager_email,
          isActive: data.data.is_active,
          createdAt: data.data.created_at,
          updatedAt: data.data.updated_at
        };
        setLocations(prev => [...prev, newLocation]);
        return newLocation;
      }
      return null;
    } catch (err: any) {
      console.error('Error creating location:', err);
      setError(err.message);
      return null;
    }
  };

  const updateLocation = async (id: string, updates: Partial<Location>): Promise<Location | null> => {
    if (!user?.id) return null;

    try {
      const response = await fetch(`/api/locations/${id}?userId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updates.name,
          address: updates.address,
          manager_name: updates.managerName,
          manager_email: updates.managerEmail,
          is_active: updates.isActive
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const updatedLocation: Location = {
          id: data.data.id,
          name: data.data.name,
          address: data.data.address,
          managerName: data.data.manager_name,
          managerEmail: data.data.manager_email,
          isActive: data.data.is_active,
          createdAt: data.data.created_at,
          updatedAt: data.data.updated_at
        };
        setLocations(prev => prev.map(loc => loc.id === id ? updatedLocation : loc));
        return updatedLocation;
      }
      return null;
    } catch (err: any) {
      console.error('Error updating location:', err);
      setError(err.message);
      return null;
    }
  };

  const deleteLocation = async (id: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await fetch(`/api/locations/${id}?userId=${user.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      setLocations(prev => prev.filter(loc => loc.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting location:', err);
      setError(err.message);
      return false;
    }
  };

  const getLocation = (id: string): Location | undefined => {
    return locations.find(loc => loc.id === id);
  };

  const activeLocations = locations.filter(loc => loc.isActive);

  return {
    locations,
    isLoading,
    error,
    createLocation,
    updateLocation,
    deleteLocation,
    getLocation,
    activeLocations,
    refetch: fetchLocations
  };
}
