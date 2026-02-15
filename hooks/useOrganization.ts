import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Organization, OrganizationRole, RolePermissions, ROLE_PERMISSIONS } from '../types';

interface UseOrganizationResult {
  organization: Organization | null;
  role: OrganizationRole | null;
  locationId: string | null; // For location-scoped roles
  isLoading: boolean;
  error: string | null;
  permissions: RolePermissions | null;
  isOwner: boolean;
  isAdmin: boolean;
  isSalesperson: boolean;
  isTechnician: boolean;
  isLeadTechnician: boolean;
  createOrganization: (name: string) => Promise<Organization | null>;
  updateOrganization: (updates: Partial<Organization>) => Promise<Organization | null>;
  refetch: () => Promise<void>;
  hasPermission: (permission: keyof RolePermissions) => boolean;
}

export function useOrganization(): UseOrganizationResult {
  const { user } = useUser();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<OrganizationRole | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    if (!user?.id) {
      setOrganization(null);
      setRole(null);
      setLocationId(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/organizations?userId=${user.id}`);
      if (!response.ok) {
        if (response.status === 404 || response.status === 500) {
          setOrganization(null);
          setRole(null);
          setLocationId(null);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch organization');
      }

      const data = await response.json();
      if (data.success) {
        if (data.data) {
          // Transform snake_case to camelCase
          const org: Organization = {
            id: data.data.id,
            name: data.data.name,
            ownerUserId: data.data.owner_user_id,
            stripeCustomerId: data.data.stripe_customer_id,
            createdAt: data.data.created_at,
            updatedAt: data.data.updated_at
          };
          setOrganization(org);
          setRole(data.role);
          setLocationId(data.locationId || null);
        } else {
          setOrganization(null);
          setRole(null);
          setLocationId(null);
        }
      }
    } catch (err: any) {
      console.error('Error fetching organization:', err);
      setError(err.message || 'Failed to load organization');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const createOrganization = async (name: string): Promise<Organization | null> => {
    if (!user?.id) return null;

    try {
      const response = await fetch(`/api/organizations?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create organization');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const newOrg: Organization = {
          id: data.data.id,
          name: data.data.name,
          ownerUserId: data.data.owner_user_id,
          stripeCustomerId: data.data.stripe_customer_id,
          createdAt: data.data.created_at,
          updatedAt: data.data.updated_at
        };
        setOrganization(newOrg);
        setRole(data.role);
        return newOrg;
      }
      return null;
    } catch (err: any) {
      console.error('Error creating organization:', err);
      setError(err.message);
      return null;
    }
  };

  const updateOrganization = async (updates: Partial<Organization>): Promise<Organization | null> => {
    if (!user?.id || !organization) return null;

    try {
      const response = await fetch(`/api/organizations?userId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updates.name,
          stripe_customer_id: updates.stripeCustomerId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update organization');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const updatedOrg: Organization = {
          id: data.data.id,
          name: data.data.name,
          ownerUserId: data.data.owner_user_id,
          stripeCustomerId: data.data.stripe_customer_id,
          createdAt: data.data.created_at,
          updatedAt: data.data.updated_at
        };
        setOrganization(updatedOrg);
        return updatedOrg;
      }
      return null;
    } catch (err: any) {
      console.error('Error updating organization:', err);
      setError(err.message);
      return null;
    }
  };

  // Get permissions for current role
  const permissions = useMemo(() => {
    if (!role) return null;
    return ROLE_PERMISSIONS[role];
  }, [role]);

  // Role check helpers
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const isSalesperson = role === 'salesperson';
  const isTechnician = role === 'technician';
  const isLeadTechnician = role === 'lead_technician';

  // Permission check helper
  const hasPermission = useCallback((permission: keyof RolePermissions): boolean => {
    if (!permissions) return false;
    return permissions[permission];
  }, [permissions]);

  return {
    organization,
    role,
    locationId,
    isLoading,
    error,
    permissions,
    isOwner,
    isAdmin,
    isSalesperson,
    isTechnician,
    isLeadTechnician,
    createOrganization,
    updateOrganization,
    refetch: fetchOrganization,
    hasPermission
  };
}
