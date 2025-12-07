import { supabase } from "@/supabase/client";
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
  school_id: string;
  class_id?: string;
  roll_number?: string;
}

export interface AuthenticatedUser {
  user: User;
  profile: UserProfile;
}

export const authService = {
  async login(
    email: string,
    password: string
  ): Promise<AuthenticatedUser | null> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, // Use the passed email parameter
      password, // Use the passed password parameter
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      return null;
    }

    console.log("Login Data:", data);

    const profile = await authService.getProfile(data.user.id);

    return {
      user: data.user as unknown as User,
      profile,
    };
  },

  async signup(
    name: string,
    email: string,
    role: UserRole,
    password: string
  ): Promise<void> {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            role,
            name,
          },
        },
      });

      if (signUpError) throw signUpError;

      console.log(data);
      alert("Check your email for the confirmation link!");
    } catch (error) {
      console.error("Sign Up Error:", error.message);
      throw new Error(error.message);
    }
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },

  async getProfile(userId: string): Promise<UserProfile> {
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .eq("id", userId)
      .maybeSingle(); // Use maybeSingle to avoid error when no row found

    console.log("Fetched profile : ", profileData, userId);

    if (error) {
      // Handle RLS or database errors
      throw new Error("Unable to access your profile. Please contact support.");
    }

    if (!profileData) {
      // No profile found - user exists in auth but not in profiles table
      throw new Error("Account not found. Please check your credentials or contact support.");
    }

    // @ts-ignore
    const userRole = profileData.user_roles?.role as UserRole;

    if (!userRole) {
      throw new Error("Your account is not properly configured. Please contact your school administrator.");
    }

    const profile: UserProfile = {
        ...profileData,
        role: userRole
    };

    return profile;
  },
};
