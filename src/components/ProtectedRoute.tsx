import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { UserRole } from "@/lib/auth";
import { logger } from "@/lib/logger";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ProtectedRouteProps {
  children: ReactNode;
  role?: UserRole;
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { session, profile, loading, profileLoading } = useAuth();

  // Wait for initial auth check
  if (loading) return <LoadingSpinner />;

  // If no session, redirect based on required role
  if (!session) {
    // Super admins should use super admin login page
    if (role === "super_admin") {
      return <Navigate to="/super-admin-login" />;
    }
    // School admins should use admin login page
    if (role === "school_admin") {
      return <Navigate to="/admin-login" />;
    }
    // Everyone else uses regular login
    return <Navigate to="/login" />;
  }

  // If we have a session but profile is still loading and we don't have a 
  // cached version yet, wait. If we HAVE a profile, we show the page
  // even if it's currently revalidating in the background.
  if (profileLoading && !profile) return <LoadingSpinner />;

  // If role is required but profile doesn't exist or role doesn't match
  if (role) {
    if (!profile) {
      logger.log('[ProtectedRoute] Profile is null, redirecting to login');
      // Profile failed to load, redirect to appropriate login
      if (role === "super_admin") {
        return <Navigate to="/super-admin-login" />;
      }
      if (role === "school_admin") {
        return <Navigate to="/admin-login" />;
      }
      return <Navigate to="/login" />;
    }
    
    // Debug logging
    logger.log('[ProtectedRoute] Role check:', {
      requiredRole: role,
      profileRole: profile.role,
      match: profile.role === role
    });
    
    if (profile.role !== role) {
      logger.warn('[ProtectedRoute] Role mismatch! Required:', role, 'Got:', profile.role);
      return <Navigate to="/not-found" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
