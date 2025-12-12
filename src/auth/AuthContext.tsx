
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/mockBackend";
// Mock Session type
type Session = any;
import { UserProfile } from "@/lib/auth";

interface AuthContextType {

  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
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
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        // Session error - user likely not authenticated
      }

      setSession(data.session);

      if (data.session?.user) {
        setProfileLoading(true);
        await fetchUserProfile(data.session.user.id);
        setProfileLoading(false);
      } else {
        setProfileLoading(false);
      }

      setLoading(false);
    });

    // Listen to login/logout/session refresh
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (newSession?.user) {
          setProfileLoading(true);
          fetchUserProfile(newSession.user.id).finally(() => {
            setProfileLoading(false);
          });
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile from Supabase
  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .eq("id", userId)
      .single();

    if (error) {
      setProfile(null);
      return;
    }

    if (!data) {
      setProfile(null);
      return;
    }

    // Transform to UserProfile type
    // @ts-ignore
    const userRole = data.user_roles?.role as UserRole;

    const formattedProfile: UserProfile = {
      ...data,
      role: userRole
    };

    setProfile(formattedProfile);
  };

  // Logout function
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    setSession(null);
    setProfile(null);
  };

  // Refresh profile function (for after avatar upload, etc.)
  const refreshProfile = async () => {
    if (session?.user) {
      await fetchUserProfile(session.user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, profileLoading, logout, refreshProfile }}
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
