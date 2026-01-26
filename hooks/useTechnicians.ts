import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Technician, TechnicianRole } from '../types';
import { useDemoMode } from './useDemoMode';
import { generateDemoTechnicians } from './useDemoData';

interface UseTechniciansResult {
  technicians: Technician[];
  isLoading: boolean;
  error: string | null;
  isDemo: boolean;
  createTechnician: (technician: Omit<Technician, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Technician | null>;
  updateTechnician: (id: string, updates: Partial<Technician>) => Promise<Technician | null>;
  deleteTechnician: (id: string) => Promise<boolean>;
  getTechnician: (id: string) => Technician | undefined;
  getTechniciansByLocation: (locationId: string) => Technician[];
  activeTechnicians: Technician[];
  refetch: () => Promise<void>;
}

export function useTechnicians(): UseTechniciansResult {
  const { user } = useUser();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { shouldInjectDemoData, dismissDemoData } = useDemoMode();

  const fetchTechnicians = useCallback(async () => {
    if (!user?.id) {
      setTechnicians([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/technicians?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch technicians');
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Transform snake_case to camelCase
        const transformedTechnicians: Technician[] = data.data.map((tech: any) => ({
          id: tech.id,
          locationId: tech.location_id,
          name: tech.name,
          email: tech.email,
          phone: tech.phone,
          role: tech.role as TechnicianRole,
          isActive: tech.is_active,
          createdAt: tech.created_at,
          updatedAt: tech.updated_at
        }));
        setTechnicians(transformedTechnicians);
      }
    } catch (err: any) {
      console.error('Error fetching technicians:', err);
      setError(err.message || 'Failed to load technicians');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  const createTechnician = async (technician: Omit<Technician, 'id' | 'createdAt' | 'updatedAt'>): Promise<Technician | null> => {
    if (!user?.id) return null;

    try {
      const response = await fetch(`/api/technicians?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: technician.locationId,
          name: technician.name,
          email: technician.email,
          phone: technician.phone,
          role: technician.role,
          is_active: technician.isActive
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create technician');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const newTechnician: Technician = {
          id: data.data.id,
          locationId: data.data.location_id,
          name: data.data.name,
          email: data.data.email,
          phone: data.data.phone,
          role: data.data.role as TechnicianRole,
          isActive: data.data.is_active,
          createdAt: data.data.created_at,
          updatedAt: data.data.updated_at
        };
        setTechnicians(prev => [...prev, newTechnician]);
        return newTechnician;
      }
      return null;
    } catch (err: any) {
      console.error('Error creating technician:', err);
      setError(err.message);
      return null;
    }
  };

  const updateTechnician = async (id: string, updates: Partial<Technician>): Promise<Technician | null> => {
    if (!user?.id) return null;

    // Guard against modifying demo data
    if (id.startsWith('demo_')) {
      setError('Cannot modify demo technicians. Create your own team member to get started!');
      return null;
    }

    try {
      const response = await fetch(`/api/technicians/${id}?userId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: updates.locationId,
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          role: updates.role,
          is_active: updates.isActive
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update technician');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const updatedTechnician: Technician = {
          id: data.data.id,
          locationId: data.data.location_id,
          name: data.data.name,
          email: data.data.email,
          phone: data.data.phone,
          role: data.data.role as TechnicianRole,
          isActive: data.data.is_active,
          createdAt: data.data.created_at,
          updatedAt: data.data.updated_at
        };
        setTechnicians(prev => prev.map(tech => tech.id === id ? updatedTechnician : tech));
        return updatedTechnician;
      }
      return null;
    } catch (err: any) {
      console.error('Error updating technician:', err);
      setError(err.message);
      return null;
    }
  };

  const deleteTechnician = async (id: string): Promise<boolean> => {
    if (!user?.id) return false;

    // Guard against deleting demo data
    if (id.startsWith('demo_')) {
      setError('Cannot delete demo technicians. Create your own team member to get started!');
      return false;
    }

    try {
      const response = await fetch(`/api/technicians/${id}?userId=${user.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete technician');
      }

      setTechnicians(prev => prev.filter(tech => tech.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting technician:', err);
      setError(err.message);
      return false;
    }
  };

  // Determine if we should show demo data
  const isDemo = useMemo(() => {
    return !isLoading && shouldInjectDemoData(technicians.length);
  }, [isLoading, technicians.length, shouldInjectDemoData]);

  // Get effective technicians (real or demo)
  const effectiveTechnicians = useMemo(() => {
    if (isDemo) {
      return generateDemoTechnicians();
    }
    return technicians;
  }, [isDemo, technicians]);

  const getTechnician = (id: string): Technician | undefined => {
    return effectiveTechnicians.find(tech => tech.id === id);
  };

  const getTechniciansByLocation = (locationId: string): Technician[] => {
    return effectiveTechnicians.filter(tech => tech.locationId === locationId);
  };

  const activeTechnicians = effectiveTechnicians.filter(tech => tech.isActive);

  // Wrapped create that dismisses demo mode
  const createTechnicianWithDemoCheck = useCallback(async (
    technician: Omit<Technician, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Technician | null> => {
    if (isDemo) {
      dismissDemoData();
    }
    return createTechnician(technician);
  }, [createTechnician, isDemo, dismissDemoData]);

  return {
    technicians: effectiveTechnicians,
    isLoading,
    error,
    isDemo,
    createTechnician: createTechnicianWithDemoCheck,
    updateTechnician,
    deleteTechnician,
    getTechnician,
    getTechniciansByLocation,
    activeTechnicians,
    refetch: fetchTechnicians
  };
}
