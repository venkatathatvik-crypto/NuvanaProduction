import { useAuth } from "@/auth/AuthContext";
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import LoadingSpinner from "./LoadingSpinner";

interface AuthRedirectProps {
  children: ReactNode;
}

const AuthRedirect = ({ children }: AuthRedirectProps) => {
  const { session, profile, loading, profileLoading } = useAuth();
  console.log("---------------------------------------------------");
  console.log(session, profile, loading, profileLoading);

  // Wait for initial auth check
  if (loading) return <LoadingSpinner />;

  // If we have a session but profile is still loading, wait
  if (session && profileLoading) return <LoadingSpinner />;

  // If authenticated with valid profile, redirect based on role
  if (session && profile) {
    if (profile.role === "student") {
      return <Navigate to="/student" replace />;
    }
    if (profile.role === "teacher") {
      return <Navigate to="/teacher" replace />;
    }
    if (profile.role === "school_admin") {
      return <Navigate to="/admin" replace />;
    }
    if (profile.role === "super_admin") {
      return <Navigate to="/super-admin" replace />;
    }
  }

  return <>{children}</>;
};

export default AuthRedirect;
