// context/AuthContext.tsx

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/supabase/client";
import { Session } from "@supabase/supabase-js";
import { UserProfile } from "@/lib/auth";

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  logout: () => Promise<void>;
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

  console.log("%c🔵 AuthContext Mounted", "color: dodgerblue");

  useEffect(() => {
    console.log("%c🔍 Checking existing Supabase session...", "color: orange");

    supabase.auth.getSession().then(async ({ data, error }) => {
      console.log("➡️ getSession() response:", data, error);

      if (error) console.error("❌ Error getting session:", error);

      setSession(data.session);
      console.log("✔️ Session set to:", data.session);

      if (data.session?.user) {
        console.log("📌 User found in session:", data.session.user.id);
        setProfileLoading(true);
        await fetchUserProfile(data.session.user.id);
        setProfileLoading(false);
      } else {
        console.log("⚠️ No user found in initial session.");
        setProfileLoading(false);
      }

      setLoading(false);
    });

    // Listen to login/logout/session refresh
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(
           "%c🔄 Auth state changed:",
           "color: cyan",
           event,
           newSession
         );

        setSession(newSession);
        console.log("✔️ Updated session:", newSession);

        if (newSession?.user) {
          console.log("📌 Fetching profile for user:", newSession.user.id);
          setProfileLoading(true);
          fetchUserProfile(newSession.user.id).finally(() => {
            setProfileLoading(false);
          });
        } else {
          console.log("⚠️ No session user → clearing profile.");
          setProfile(null);
          setProfileLoading(false);
        }
      }
    );

    return () => {
      console.log("%c🧹 Cleaning up AuthListener", "color: gray");
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile from Supabase
  const fetchUserProfile = async (userId: string) => {
    console.log("%c📥 Fetching profile for ID: " + userId, "color: violet");

    const { data, error } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .eq("id", userId)
      .single();

    console.log("➡️ Supabase Profile Fetch Result:", { data, error });

    if (error) {
      console.error("❌ Profile fetch error:", error);
      setProfile(null);
      return;
    }

    if (!data) {
      console.warn("⚠️ No profile returned for user. Check profiles table.");
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
    console.log("✔️ Profile state updated to:", formattedProfile);
  };

  // Logout function
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("❌ Logout error:", error);
      throw new Error(error.message);
    }
    setSession(null);
    setProfile(null);
  };

  console.log("🔎 Current Auth State:", { session, profile, loading, profileLoading });

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, profileLoading, logout }}
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
