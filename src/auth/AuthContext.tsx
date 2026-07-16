import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserProfile, authService, UserRole } from "@/lib/auth";
import { getCachedProfile, clearQueryCache } from "@/lib/db";
import { logger } from "@/lib/logger";

// Session type - simplified to just contain user data
// Session type - simplified to just contain user data
interface Session {
  user: {
    id: string;
    email: string;
  };
  access_token: string | null;
}

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  showSessionExpired: boolean;
  login: (email: string, password: string, role?: UserRole, schoolId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  handleSessionExpired: () => void;
  closeSessionExpiredModal: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if we have JWT tokens
        const accessToken = authService.getAccessToken();
        logger.log(
          "[AuthProvider] Initializing auth, token present:",
          !!accessToken
        );

        if (!accessToken) {
          // No token, user is not authenticated
          logger.log("[AuthProvider] No access token found");
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // ── OFFLINE-FIRST: INSTANT CACHE RESTORE ────────────────────────────
        // We prioritize showing the user's last-known data so the dashboard
        // appears immediately even if the network is flaky or offline.
        logger.log("[AuthProvider] Found token — restoring from IndexedDB cache first...");
        try {
          const cachedProfile = await getCachedProfile();
          if (cachedProfile) {
            logger.log(
              "[AuthProvider] Success: restored profile from cache (stale-while-revalidate), user:",
              cachedProfile.email
            );
            setSession({
              user: { id: cachedProfile.id, email: cachedProfile.email || "" },
              access_token: accessToken,
            });
            setProfile(cachedProfile);
            
            // ── OFFLINE-FIRST INDUSTRY STANDARD: UNBLOCK IMMEDIATELY ──────
            // We set loading=false NOW so the UI (Dashboard) renders instantly.
            // validateSession will continue in the background to confirm the
            // session is still fresh.
            setLoading(false);
          }
        } catch (cacheError) {
          logger.warn("[AuthProvider] Cache read check failed:", cacheError);
        }

        // ── BACKGROUND VALIDATION (STALE-WHILE-REVALIDATE) ─────────────────
        // We call validateSession to check if the session is still valid.
        
        // Only show a blocking spinner if we DON'T have a cached profile yet.
        // If we have a profile, this revalidation happens silently in the background.
        if (!profile) {
          setProfileLoading(true);
        }
        
        try {
          // validateSession() has a 5s timeout.
          const userProfile = await authService.validateSession();

          if (userProfile) {
            const currentToken = authService.getAccessToken();
            logger.log("[AuthProvider] Session verified with backend");
            setSession({
              user: { id: userProfile.id, email: userProfile.email || "" },
              access_token: currentToken,
            });
            setProfile(userProfile);
          } else {
            // Server explicitly said session is invalid
            logger.log("[AuthProvider] Session invalid, clearing auth");
            setSession(null);
            setProfile(null);
          }
        } catch (error: any) {
          logger.error("[AuthProvider] Network/Validation error:", error);
          // If we already have a profile from cache, we DON'T clear it on 
          // network error. We only clear it on a 401 (handled in authService).
        } finally {
          setProfileLoading(false);
          setLoading(false);
        }
      } catch (globalError) {
        logger.error("[AuthProvider] Global initialization error:", globalError);
        setSession(null);
        setProfile(null);
        setLoading(false);
      }
    };

    initializeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle session expiry - defined before useEffect to avoid closure issues
  const handleSessionExpired = () => {
    setSession(null);
    setProfile(null);
    setShowSessionExpired(true);
  };

  // Close session expired modal
  const closeSessionExpiredModal = () => {
    setShowSessionExpired(false);
  };

  // Listen for session expiry events from apiClient
  useEffect(() => {
    const handleSessionExpiredEvent = () => {
      handleSessionExpired();
    };

    // Import SESSION_EXPIRED_EVENT dynamically to avoid circular dependency
    window.addEventListener('session-expired', handleSessionExpiredEvent);

    return () => {
      window.removeEventListener('session-expired', handleSessionExpiredEvent);
    };
  }, [handleSessionExpired]);

  // Login function
  const login = async (email: string, password: string, role?: UserRole, schoolId?: string) => {
    setProfileLoading(true);
    try {
      const data = await authService.login(email, password, role, schoolId);

      if (data) {
        // Set session and profile from login response
        const newSession: Session = {
          user: {
            id: data.user.id,
            email: data.user.email,
          },
          access_token: authService.getAccessToken(),
        };

        setSession(newSession);
        setProfile(data.profile);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    await authService.logout();

    // Clear in-memory query cache so the next user doesn't see stale data
    queryClient.clear();

    // Clear the persisted query cache from IndexedDB to prevent cross-user
    // data leaks if a different account logs in on the same browser
    await clearQueryCache();

    setSession(null);
    setProfile(null);
  };

  // Refresh profile function (for after avatar upload, etc.)
  const refreshProfile = async () => {
    if (session?.user) {
      const userProfile = await authService.getCurrentSession();
      if (userProfile) {
        setProfile(userProfile);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        profileLoading,
        showSessionExpired,
        login,
        logout,
        refreshProfile,
        handleSessionExpired,
        closeSessionExpiredModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
