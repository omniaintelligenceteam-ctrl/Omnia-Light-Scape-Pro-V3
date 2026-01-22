import { useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ProjectAssignment, ClientAssignment, ProjectAssignmentRole } from '../types';

interface UseProjectAssignmentsResult {
  assignments: ProjectAssignment[];
  isLoading: boolean;
  error: string | null;
  fetchAssignments: (projectId: string) => Promise<ProjectAssignment[]>;
  assignUser: (projectId: string, userId: string, role: ProjectAssignmentRole) => Promise<boolean>;
  removeAssignment: (projectId: string, assignmentId?: string, userId?: string) => Promise<boolean>;
}

interface UseClientAssignmentsResult {
  assignments: ClientAssignment[];
  isLoading: boolean;
  error: string | null;
  fetchAssignments: (clientId: string) => Promise<ClientAssignment[]>;
  assignUser: (clientId: string, userId: string, isPrimary?: boolean) => Promise<boolean>;
  setPrimary: (clientId: string, assignmentId: string) => Promise<boolean>;
  removeAssignment: (clientId: string, assignmentId?: string, userId?: string) => Promise<boolean>;
}

export function useProjectAssignments(): UseProjectAssignmentsResult {
  const { user } = useUser();
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async (projectId: string): Promise<ProjectAssignment[]> => {
    if (!user?.id) return [];

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/assignments?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project assignments');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setAssignments(data.data);
        return data.data;
      }
      return [];
    } catch (err: any) {
      console.error('Error fetching project assignments:', err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const assignUser = async (projectId: string, userId: string, role: ProjectAssignmentRole): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await fetch(`/api/projects/${projectId}/assignments?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign user');
      }

      // Refresh assignments
      await fetchAssignments(projectId);
      return true;
    } catch (err: any) {
      console.error('Error assigning user:', err);
      setError(err.message);
      return false;
    }
  };

  const removeAssignment = async (projectId: string, assignmentId?: string, userId?: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await fetch(`/api/projects/${projectId}/assignments?userId=${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, userId })
      });

      if (!response.ok) {
        throw new Error('Failed to remove assignment');
      }

      // Remove from local state
      if (assignmentId) {
        setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      } else if (userId) {
        setAssignments(prev => prev.filter(a => a.userId !== userId));
      }
      return true;
    } catch (err: any) {
      console.error('Error removing assignment:', err);
      setError(err.message);
      return false;
    }
  };

  return {
    assignments,
    isLoading,
    error,
    fetchAssignments,
    assignUser,
    removeAssignment
  };
}

export function useClientAssignments(): UseClientAssignmentsResult {
  const { user } = useUser();
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async (clientId: string): Promise<ClientAssignment[]> => {
    if (!user?.id) return [];

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/clients/${clientId}/assignments?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch client assignments');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setAssignments(data.data);
        return data.data;
      }
      return [];
    } catch (err: any) {
      console.error('Error fetching client assignments:', err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const assignUser = async (clientId: string, userId: string, isPrimary: boolean = false): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await fetch(`/api/clients/${clientId}/assignments?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isPrimary })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign user');
      }

      // Refresh assignments
      await fetchAssignments(clientId);
      return true;
    } catch (err: any) {
      console.error('Error assigning user:', err);
      setError(err.message);
      return false;
    }
  };

  const setPrimary = async (clientId: string, assignmentId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await fetch(`/api/clients/${clientId}/assignments?userId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, isPrimary: true })
      });

      if (!response.ok) {
        throw new Error('Failed to set primary');
      }

      // Refresh assignments
      await fetchAssignments(clientId);
      return true;
    } catch (err: any) {
      console.error('Error setting primary:', err);
      setError(err.message);
      return false;
    }
  };

  const removeAssignment = async (clientId: string, assignmentId?: string, userId?: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await fetch(`/api/clients/${clientId}/assignments?userId=${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, userId })
      });

      if (!response.ok) {
        throw new Error('Failed to remove assignment');
      }

      // Remove from local state
      if (assignmentId) {
        setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      } else if (userId) {
        setAssignments(prev => prev.filter(a => a.userId !== userId));
      }
      return true;
    } catch (err: any) {
      console.error('Error removing assignment:', err);
      setError(err.message);
      return false;
    }
  };

  return {
    assignments,
    isLoading,
    error,
    fetchAssignments,
    assignUser,
    setPrimary,
    removeAssignment
  };
}
