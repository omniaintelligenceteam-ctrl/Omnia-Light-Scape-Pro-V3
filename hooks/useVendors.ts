import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';

export interface Vendor {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  payment_terms: 'due_on_receipt' | 'net15' | 'net30' | 'net60';
  account_number?: string;
  default_category?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  payment_terms?: 'due_on_receipt' | 'net15' | 'net30' | 'net60';
  account_number?: string;
  default_category?: string;
  notes?: string;
  is_active?: boolean;
}

export function useVendors() {
  const { user } = useUser();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all vendors
  const fetchVendors = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/vendors?userId=${user.id}`);
      const data = await res.json();

      if (data.success) {
        setVendors(data.vendors || []);
      } else {
        setError(data.error || 'Failed to fetch vendors');
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Failed to fetch vendors');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Create a new vendor
  const createVendor = useCallback(async (data: VendorFormData): Promise<{ success: boolean; vendor?: Vendor; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`/api/vendors?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (result.success && result.vendor) {
        setVendors(prev => [result.vendor, ...prev]);
        return { success: true, vendor: result.vendor };
      }
      return { success: false, error: result.error || 'Failed to create vendor' };
    } catch (err) {
      console.error('Error creating vendor:', err);
      return { success: false, error: 'Failed to create vendor' };
    }
  }, [user?.id]);

  // Update a vendor
  const updateVendor = useCallback(async (id: string, data: Partial<VendorFormData>): Promise<{ success: boolean; vendor?: Vendor; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`/api/vendors?userId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      const result = await res.json();

      if (result.success && result.vendor) {
        setVendors(prev => prev.map(v => v.id === id ? result.vendor : v));
        return { success: true, vendor: result.vendor };
      }
      return { success: false, error: result.error || 'Failed to update vendor' };
    } catch (err) {
      console.error('Error updating vendor:', err);
      return { success: false, error: 'Failed to update vendor' };
    }
  }, [user?.id]);

  // Delete a vendor
  const deleteVendor = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`/api/vendors?userId=${user.id}&vendorId=${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();

      if (result.success) {
        setVendors(prev => prev.filter(v => v.id !== id));
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to delete vendor' };
    } catch (err) {
      console.error('Error deleting vendor:', err);
      return { success: false, error: 'Failed to delete vendor' };
    }
  }, [user?.id]);

  // Fetch on mount
  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return {
    vendors,
    isLoading,
    error,
    fetchVendors,
    createVendor,
    updateVendor,
    deleteVendor,
  };
}

export default useVendors;
