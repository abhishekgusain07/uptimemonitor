"use client";

import { createContext, useContext, useEffect } from "react";
import { authClient } from "@/lib/auth-client";

// Use Better Auth's inferred types directly from the client
type SessionData = ReturnType<typeof authClient.useSession>['data'];
type User = NonNullable<SessionData>['user'];
type Session = NonNullable<SessionData>['session'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: typeof authClient.signIn;
  signUp: typeof authClient.signUp;
  signOut: typeof authClient.signOut;
  updateUser: typeof authClient.updateUser;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Use the built-in useSession hook from better-auth
  const { data: sessionData, isPending: isLoading } = authClient.useSession();

  const value: AuthContextType = {
    user: sessionData?.user || null,
    session: sessionData?.session || null,
    isLoading,
    signIn: authClient.signIn,
    signUp: authClient.signUp,
    signOut: authClient.signOut,
    updateUser: authClient.updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook for protected routes
export function useRequireAuth() {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      // Redirect to login page
      window.location.href = "/auth/signin";
    }
  }, [auth.isLoading, auth.user]);

  return auth;
}