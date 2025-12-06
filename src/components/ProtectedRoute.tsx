import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { UserRole } from "@/lib/auth";
import { ReactNode } from "react";
import LoadingSpinner from "./LoadingSpinner";

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

  // If we have a session but profile is still loading, wait
  if (profileLoading) return <LoadingSpinner />;

  // If role is required but profile doesn't exist or role doesn't match
  if (role) {
    if (!profile) {
      // Profile failed to load, redirect to appropriate login
      if (role === "super_admin") {
        return <Navigate to="/super-admin-login" />;
      }
      if (role === "school_admin") {
        return <Navigate to="/admin-login" />;
      }
      return <Navigate to="/login" />;
    }
    if (profile.role !== role) {
      return <Navigate to="/NotFound" />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

