import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { UserProfile, authService, UserRole } from "@/lib/auth";
import { logger } from "@/lib/logger";

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
  login: (email: string, password: string, role?: UserRole, schoolId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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

        // Validate session with backend
        logger.log("[AuthProvider] Validating session with backend...");
        setProfileLoading(true);
        const userProfile = await authService.validateSession();

        if (userProfile) {
          // Session is valid, set session and profile
          logger.log(
            "[AuthProvider] Session valid, user:",
            userProfile.email,
            "role:",
            userProfile.role
          );
          setSession({
            user: {
              id: userProfile.id,
              email: userProfile.email || "",
            },
            access_token: accessToken,
          });
          setProfile(userProfile);
        } else {
          // Session validation failed, clear everything
          logger.log(
            "[AuthProvider] Session validation returned null, clearing auth"
          );
          setSession(null);
          setProfile(null);
        }
      } catch (error) {
        console.error(
          "[AuthProvider] Error during auth initialization:",
          error
        );
        setSession(null);
        setProfile(null);
      } finally {
        setProfileLoading(false);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

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
        login,
        logout,
        refreshProfile,
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
