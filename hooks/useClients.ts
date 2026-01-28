import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Client } from '../types';
import { useDemoMode } from './useDemoMode';
import { generateDemoClients } from './useDemoData';

// CSV parsing utility
export interface ParsedClientRow {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  rowNumber: number;
  error?: string;
}

export interface CSVParseResult {
  valid: ParsedClientRow[];
  invalid: ParsedClientRow[];
  headers: string[];
}

export function parseClientCSV(csvText: string): CSVParseResult {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    return { valid: [], invalid: [], headers: [] };
  }

  // Parse headers (first row)
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  // Find column indices
  const nameIdx = headers.findIndex(h => h === 'name' || h === 'client name' || h === 'client');
  const emailIdx = headers.findIndex(h => h === 'email' || h === 'e-mail');
  const phoneIdx = headers.findIndex(h => h === 'phone' || h === 'telephone' || h === 'tel');
  const addressIdx = headers.findIndex(h => h === 'address' || h === 'location');
  const notesIdx = headers.findIndex(h => h === 'notes' || h === 'comments' || h === 'note');

  const valid: ParsedClientRow[] = [];
  const invalid: ParsedClientRow[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted CSV values
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: ParsedClientRow = {
      name: nameIdx >= 0 ? values[nameIdx] || '' : values[0] || '',
      email: emailIdx >= 0 ? values[emailIdx] : undefined,
      phone: phoneIdx >= 0 ? values[phoneIdx] : undefined,
      address: addressIdx >= 0 ? values[addressIdx] : undefined,
      notes: notesIdx >= 0 ? values[notesIdx] : undefined,
      rowNumber: i + 1,
    };

    // Validate - name is required
    if (!row.name) {
      row.error = 'Missing name';
      invalid.push(row);
    } else {
      valid.push(row);
    }
  }

  return { valid, invalid, headers };
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

export function useClients() {
  const { user } = useUser();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { shouldInjectDemoData, dismissDemoData } = useDemoMode();

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
            leadSource: c.lead_source || undefined,
            marketingCost: c.marketing_cost || undefined,
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

      const data = await response.json();

      if (!response.ok) {
        // Show more specific error message
        const errorMsg = data.message || data.error || 'Failed to create client';
        throw new Error(errorMsg);
      }

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
      // Re-throw so caller can handle
      throw err;
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

    // Guard against modifying demo data
    if (id.startsWith('demo_')) {
      setError('Cannot modify demo clients. Create your own client to get started!');
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

    // Guard against deleting demo data
    if (id.startsWith('demo_')) {
      setError('Cannot delete demo clients. Create your own client to get started!');
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

  // Bulk import clients from CSV data
  const importClients = useCallback(async (
    rows: ParsedClientRow[],
    onProgress?: (current: number, total: number) => void
  ): Promise<ImportResult> => {
    if (!user) {
      return { imported: 0, failed: rows.length, errors: ['User not logged in'] };
    }

    const result: ImportResult = { imported: 0, failed: 0, errors: [] };
    const newClients: Client[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      onProgress?.(i + 1, rows.length);

      try {
        const response = await fetch(`/api/clients?userId=${user.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: row.name,
            email: row.email || undefined,
            phone: row.phone || undefined,
            address: row.address || undefined,
            notes: row.notes || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to import row ${row.rowNumber}`);
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
          newClients.push(newClient);
          result.imported++;
        } else {
          result.failed++;
          result.errors.push(`Row ${row.rowNumber}: Failed to save`);
        }
      } catch (err: any) {
        result.failed++;
        result.errors.push(`Row ${row.rowNumber} (${row.name}): ${err.message}`);
      }
    }

    // Update local state with all new clients
    if (newClients.length > 0) {
      setClients(prev => [...newClients, ...prev]);
    }

    return result;
  }, [user]);

  // Determine if we should show demo data
  const isDemo = useMemo(() => {
    return !isLoading && shouldInjectDemoData(clients.length);
  }, [isLoading, clients.length, shouldInjectDemoData]);

  // Get effective clients (real or demo)
  const effectiveClients = useMemo(() => {
    if (isDemo) {
      return generateDemoClients();
    }
    return clients;
  }, [isDemo, clients]);

  // Wrapped create that dismisses demo mode
  const createClientWithDemoCheck = useCallback(async (
    clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Client | null> => {
    if (isDemo) {
      dismissDemoData();
    }
    return createClient(clientData);
  }, [createClient, isDemo, dismissDemoData]);

  // Search in effective clients
  const searchEffectiveClients = useCallback((query: string): Client[] => {
    if (!query.trim()) return effectiveClients;
    const q = query.toLowerCase();
    return effectiveClients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(query)
    );
  }, [effectiveClients]);

  // Sort clients by different criteria
  const sortClients = useCallback((clientList: Client[], sortBy: 'name-asc' | 'name-desc' | 'projects' | 'recent' | 'revenue'): Client[] => {
    const sorted = [...clientList];
    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'projects':
        return sorted.sort((a, b) => (b.projectCount || 0) - (a.projectCount || 0));
      case 'recent':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'revenue':
        return sorted.sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0));
      default:
        return sorted;
    }
  }, []);

  // Filter clients by lead source
  const filterByLeadSource = useCallback((clientList: Client[], source: string): Client[] => {
    if (source === 'all') return clientList;
    return clientList.filter(c => c.leadSource === source);
  }, []);

  // Filter clients by first letter of name
  const filterByLetter = useCallback((clientList: Client[], letter: string): Client[] => {
    if (letter === 'all') return clientList;
    return clientList.filter(c => c.name.toUpperCase().startsWith(letter.toUpperCase()));
  }, []);

  // Get letters that have clients (for highlighting available letters)
  const getAvailableLetters = useCallback((clientList: Client[]): Set<string> => {
    const letters = new Set<string>();
    clientList.forEach(c => {
      if (c.name) {
        letters.add(c.name[0].toUpperCase());
      }
    });
    return letters;
  }, []);

  return {
    clients: effectiveClients,
    isLoading,
    error,
    isDemo,
    createClient: createClientWithDemoCheck,
    updateClient,
    deleteClient,
    searchClients: searchEffectiveClients,
    importClients,
    sortClients,
    filterByLeadSource,
    filterByLetter,
    getAvailableLetters
  };
}
