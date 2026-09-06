// frontend/src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiGet, apiPost, apiPut, ApiError } from "../lib/apiClient";
import type { Profile } from "../types";

interface AuthContextValue {
  user: Omit<Profile, "password"> | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile?: Profile | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: "admin" | "organizer" | "attendee",
    country?: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── Fetch current user on mount ────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      try {
        // silent401: this is a session CHECK, not an authenticated action.
        // A 401 here just means "not logged in yet" — it must NOT trigger
        // apiClient's redirect-to-login side effect.
        const response = await apiGet<{ profile: Profile }>("/auth/me", undefined, {
          silent401: true,
        });
        setUser(response.profile ?? null);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          console.log("🔐 Not logged in (silent)");
        } else {
          console.error("Failed to load user:", error);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // ─── Refresh profile ─────────────────────────────────────────────
  // Returns the fresh profile (or null) so callers like signIn() don't
  // have to rely on a stale `user` closure value.
  async function refreshProfile(): Promise<Profile | null> {
    try {
      const response = await apiGet<{ profile: Profile }>("/auth/me", undefined, {
        silent401: true,
      });
      setUser(response.profile ?? null);
      return response.profile ?? null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
      } else {
        console.error("Failed to refresh profile:", error);
      }
      return null;
    }
  }

  // ─── Sign Up ──────────────────────────────────────────────────────
  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: "admin" | "organizer" | "attendee",
    country: string = "Nigeria"
  ): Promise<{ error: string | null }> {
    try {
      const response = await apiPost<{
        message: string; success: boolean; userId: string; email: string; role: string
      }>(
        "/auth/signup",
        { email, password, fullName, role, country }
      );
      if (!response.success) {
        return { error: response.message || "Signup failed" };
      }
      await refreshProfile();
      return { error: null };
    } catch (error) {
      console.error("❌ Sign up error:", error);
      return { error: error instanceof Error ? error.message : "An error occurred" };
    }
  }

  // ─── Sign In ──────────────────────────────────────────────────────
  async function signIn(email: string, password: string) {
    try {
      const response = await apiPost<{
        message: string; success: boolean; userId: string; email: string; role: string
      }>(
        "/auth/login",
        { email, password }
      );
      if (!response.success) {
        return { error: response.message || "Login failed", profile: null };
      }
      // ✅ use the freshly-fetched profile instead of the stale `user` closure
      const freshProfile = await refreshProfile();
      return { error: null, profile: freshProfile };
    } catch (error) {
      console.error("❌ Sign in error:", error);
      return { error: error instanceof Error ? error.message : "An error occurred", profile: null };
    }
  }

  // ─── Sign Out ──────────────────────────────────────────────────────
  async function signOut() {
    try {
      await apiPost<{ success: boolean }>("/auth/logout");
    } catch (error) {
      console.error("❌ Sign out error:", error);
    } finally {
      setUser(null);
    }
  }

  // ─── Update Profile ──────────────────────────────────────────────
  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return { error: "No user logged in" };

    try {
      const response = await apiPut<{
        message: string; success: boolean; user: Profile
      }>(
        `/api/users/${user.id}`,
        updates
      );
      if (!response.success) {
        return { error: response.message || "Update failed" };
      }
      if (response.user) {
        setUser(response.user);
      } else {
        await refreshProfile();
      }
      return { error: null };
    } catch (error) {
      console.error("❌ Update profile error:", error);
      return { error: error instanceof Error ? error.message : "An error occurred" };
    }
  }

  // ─── Context value ────────────────────────────────────────────────
  const value: AuthContextValue = {
    user,
    profile: user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}