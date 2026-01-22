import React from 'react';
import { useOrganization } from '../hooks/useOrganization';
import { OrganizationRole, RolePermissions } from '../types';

interface RoleGateProps {
  children: React.ReactNode;
  /** Allow specific roles */
  allowedRoles?: OrganizationRole[];
  /** Require specific permission */
  requiredPermission?: keyof RolePermissions;
  /** What to show if access denied (default: nothing) */
  fallback?: React.ReactNode;
  /** Show loading state while checking role */
  showLoading?: boolean;
}

/**
 * RoleGate - Conditionally render content based on user's role/permissions
 *
 * Usage:
 * ```tsx
 * // Allow only owners
 * <RoleGate allowedRoles={['owner']}>
 *   <BillingSettings />
 * </RoleGate>
 *
 * // Allow by permission
 * <RoleGate requiredPermission="canViewAnalytics">
 *   <AnalyticsDashboard />
 * </RoleGate>
 *
 * // With fallback
 * <RoleGate allowedRoles={['owner', 'admin']} fallback={<AccessDenied />}>
 *   <TeamSettings />
 * </RoleGate>
 * ```
 */
export const RoleGate: React.FC<RoleGateProps> = ({
  children,
  allowedRoles,
  requiredPermission,
  fallback = null,
  showLoading = false
}) => {
  const { role, hasPermission, isLoading } = useOrganization();

  // Show loading state if requested
  if (isLoading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#F6B45A] border-t-transparent" />
      </div>
    );
  }

  // If still loading and not showing loading state, render nothing
  if (isLoading) {
    return null;
  }

  // No role means user isn't in an organization
  if (!role) {
    return <>{fallback}</>;
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role)) {
      return <>{fallback}</>;
    }
  }

  // Check permission-based access
  if (requiredPermission) {
    if (!hasPermission(requiredPermission)) {
      return <>{fallback}</>;
    }
  }

  // Access granted
  return <>{children}</>;
};

/**
 * Hook to check if user has access based on role/permission
 */
export function useRoleAccess(options: {
  allowedRoles?: OrganizationRole[];
  requiredPermission?: keyof RolePermissions;
}): { hasAccess: boolean; isLoading: boolean } {
  const { role, hasPermission, isLoading } = useOrganization();

  if (isLoading) {
    return { hasAccess: false, isLoading: true };
  }

  if (!role) {
    return { hasAccess: false, isLoading: false };
  }

  // Check role-based access
  if (options.allowedRoles && options.allowedRoles.length > 0) {
    if (!options.allowedRoles.includes(role)) {
      return { hasAccess: false, isLoading: false };
    }
  }

  // Check permission-based access
  if (options.requiredPermission) {
    if (!hasPermission(options.requiredPermission)) {
      return { hasAccess: false, isLoading: false };
    }
  }

  return { hasAccess: true, isLoading: false };
}

/**
 * Higher-order component for role-based access
 */
export function withRoleGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    allowedRoles?: OrganizationRole[];
    requiredPermission?: keyof RolePermissions;
    fallback?: React.ReactNode;
  }
) {
  return function RoleGatedComponent(props: P) {
    return (
      <RoleGate
        allowedRoles={options.allowedRoles}
        requiredPermission={options.requiredPermission}
        fallback={options.fallback}
      >
        <WrappedComponent {...props} />
      </RoleGate>
    );
  };
}

export default RoleGate;
