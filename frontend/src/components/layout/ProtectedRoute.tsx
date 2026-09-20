import React from 'react';
import type { Capability, Role } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { AccessDenied } from './AccessDenied';

export interface ProtectedRouteProps {
  capability?: Capability;
  allowedRoles?: Role[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  capability,
  allowedRoles,
  children,
}) => {
  const { currentRole, hasCapability } = useAuthStore();

  // Role whitelist check (e.g. only doctor role for /doctor routes)
  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    return <AccessDenied requiredCapability={`Role: ${allowedRoles.join(' or ')}`} />;
  }

  // Doctor is not permitted to access /admin routes
  if (currentRole === 'doctor' && (!allowedRoles || !allowedRoles.includes('doctor'))) {
    return <AccessDenied requiredCapability="Admin or Reception privileges" />;
  }

  // Capability check
  if (capability && !hasCapability(capability)) {
    return <AccessDenied requiredCapability={capability} />;
  }

  return <>{children}</>;
};
