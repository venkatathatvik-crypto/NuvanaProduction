import { apiClient } from "@/lib/apiClient";
import { cacheProfile, clearCachedProfile } from "@/lib/db";
import { logger } from '@/lib/logger';

export type UserRole = "student" | "teacher" | "school_admin" | "super_admin";

export interface User {
  id: string;
  email: string;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
  school_id: string | null;
  class_id?: string;
  roll_number?: string;
  is_verified?: boolean;
  is_first_login?: boolean;
}

export interface AuthenticatedUser {
  user: User;
  profile: UserProfile;
}

// Get backend URL from environment variable
const API_URL = import.meta.env.VITE_BACKEND_URL || "https://nuvana360server.onrender.com";

export const authService = {
  /**
   * Login user with email, password, optional school_id, and optional expected role
   * Uses backend API for authentication with role validation
   */
  async login(
    email: string,
    password: string,
    expectedRole?: UserRole,
    schoolId?: string
  ): Promise<AuthenticatedUser | null> {
    try {
      // Call backend API for authentication
      const data = await apiClient.post<{
        user: any;
        access_token: string;
        refresh_token: string;
      }>("/auth/login", { email, password, expectedRole, school_id: schoolId }, { skipAuth: true });

      // Store JWT tokens in localStorage
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      const profile: UserProfile = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        school_id: data.user.school_id,
        avatar_url: data.user.avatar_url,
        is_verified: data.user.is_verified,
        is_first_login: data.user.is_first_login,
        created_at: new Date().toISOString(),
      };

      // Cache profile in IndexedDB for offline cold-start
      await cacheProfile(profile);

      return {
        user: { id: data.user.id, email: data.user.email },
        profile,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Validate current session and get user profile
   * Returns null if session is invalid
   */
  async validateSession(): Promise<UserProfile | null> {
    try {
      const accessToken = this.getAccessToken();
      if (!accessToken) {
        logger.log("[AuthService] No access token available");
        return null;
      }

      logger.log("[AuthService] Validating session...");
      // 5-second timeout: if the network is unreachable (e.g. WiFi with no
      // upstream), fail fast so AuthContext can restore from the IndexedDB
      // cache instead of hanging for the browser's default 30-90 s timeout.
      const data = await apiClient.post<{
        valid: boolean;
        user: any;
      }>("/auth/validate-session", undefined, {
        signal: AbortSignal.timeout(5000),
      });

      logger.log("[AuthService] Validation response:", data);

      if (data.valid && data.user) {
        logger.log("[AuthService] Session is valid");
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          school_id: data.user.school_id,
          avatar_url: data.user.avatar_url,
          is_verified: data.user.is_verified,
          is_first_login: data.user.is_first_login,
          created_at: data.user.created_at || new Date().toISOString(),
        };

        // Keep IndexedDB profile cache fresh after each successful online validation
        await cacheProfile(profile);

        return profile;
      }

      logger.log("[AuthService] Session validation returned invalid");
      return null;
    } catch (error: any) {
      logger.error("[AuthService] Session validation failed:", error);

      // 401 means the token is genuinely invalid — clear and return null
      if (error.status === 401) {
        logger.log("[AuthService] Got 401, clearing tokens");
        this.logout();
        return null;
      }

      // Network/server error — rethrow so AuthContext can restore from cache
      throw error;
    }
  },

  /**
   * Get current user session
   */
  async getCurrentSession(): Promise<UserProfile | null> {
    try {
      logger.log("[AuthService] Fetching current session...");
      const data = await apiClient.post<any>("/auth/session");

      logger.log("[AuthService] Session data received:", data);

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        school_id: data.school_id,
        avatar_url: data.avatar_url,
        is_verified: data.is_verified,
        is_first_login: data.is_first_login,
        created_at: data.created_at || new Date().toISOString(),
      };
    } catch (error) {
      logger.error("[AuthService] Failed to get current session:", error);
      return null;
    }
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return null;

    try {
      const data = await apiClient.post<{ access_token: string }>(
        "/auth/refresh",
        { refresh_token: refreshToken },
        { skipAuth: true }
      );

      localStorage.setItem("access_token", data.access_token);
      return data.access_token;
    } catch (error) {
      // Clear tokens on refresh failure
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return null;
    }
  },

  /**
   * Register a new super admin
   */
  async registerSuperAdmin(
    name: string,
    email: string,
    password: string,
    secret: string
  ): Promise<void> {
    try {
      await apiClient.post(
        "/auth/super-admin/register",
        { name, email, password, secret },
        { skipAuth: true }
      );

      // We don't auto-login after registration as per current flow,
      // user is redirected to login page.
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout user - clear tokens, cached profile, and call backend logout endpoint.
   * NOTE: Clearing the query cache (queryClient.clear + persister.removeClient)
   * is handled in AuthContext so we have access to the React Query client there.
   */
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      await apiClient.post("/auth/logout");
    } catch (error) {
      logger.error("Backend logout error:", error);
      // Continue with local cleanup even if backend call fails
    } finally {
      // Clear JWT tokens
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      // Clear cached profile from IndexedDB so the next user starts clean
      await clearCachedProfile();
    }
  },

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem("access_token");
  },
};
