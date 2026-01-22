import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Client } from '../types';

export function useClients() {
  const { user } = useUser();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load clients from API on mount
  useEffect(() => {
    async function loadClients() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/clients?userId=${user.id}`);

        if (!response.ok) {
          throw new Error('Failed to load clients');
        }

        const data = await response.json();

        if (data.success && data.data) {
          const loadedClients: Client[] = data.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email || undefined,
            phone: c.phone || undefined,
            address: c.address || undefined,
            notes: c.notes || undefined,
            createdAt: c.created_at,
            updatedAt: c.updated_at
          }));
          setClients(loadedClients);
        }
      } catch (err: any) {
        console.error('Error loading clients:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadClients();
  }, [user]);

  // Create a new client
  const createClient = useCallback(async (
    clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Client | null> => {
    if (!user) {
      setError('User not logged in');
      return null;
    }

    try {
      const response = await fetch(`/api/clients?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        throw new Error('Failed to create client');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const newClient: Client = {
          id: data.data.id,
          name: data.data.name,
          email: data.data.email || undefined,
          phone: data.data.phone || undefined,
          address: data.data.address || undefined,
          notes: data.data.notes || undefined,
          createdAt: data.data.created_at,
          updatedAt: data.data.updated_at
        };
        setClients(prev => [newClient, ...prev]);
        return newClient;
      }

      return null;
    } catch (err: any) {
      console.error('Error creating client:', err);
      setError(err.message);
      return null;
    }
  }, [user]);

  // Update a client
  const updateClient = useCallback(async (
    id: string,
    updates: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> => {
    if (!user) {
      setError('User not logged in');
      return false;
    }

    try {
      const response = await fetch(`/api/clients/${id}?userId=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update client');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setClients(prev => prev.map(c =>
          c.id === id
            ? {
                ...c,
                ...updates,
                updatedAt: data.data.updated_at
              }
            : c
        ));
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('Error updating client:', err);
      setError(err.message);
      return false;
    }
  }, [user]);

  // Delete a client
  const deleteClient = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('User not logged in');
      return false;
    }

    try {
      const response = await fetch(`/api/clients/${id}?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete client');
      }

      setClients(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting client:', err);
      setError(err.message);
      return false;
    }
  }, [user]);

  // Search clients by name/email/phone
  const searchClients = useCallback((query: string): Client[] => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(query)
    );
  }, [clients]);

  return {
    clients,
    isLoading,
    error,
    createClient,
    updateClient,
    deleteClient,
    searchClients
  };
}
