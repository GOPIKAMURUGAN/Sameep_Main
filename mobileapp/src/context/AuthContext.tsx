import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  clearStoredSession,
  getStoredAuthToken,
  getStoredOnboardingComplete,
  getStoredVendorId,
  setStoredAuthToken,
  setStoredOnboardingComplete,
  setStoredVendorId,
} from "../lib/storage";

type AuthState = {
  ready: boolean;
  authToken: string | null;
  vendorId: string | null;
  onboardingComplete: boolean;
};

type AuthContextValue = AuthState & {
  signIn: (payload: {
    token: string;
    vendorId?: string | null;
    onboardingComplete?: boolean;
  }) => Promise<void>;
  completeOnboarding: (vendorId: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ready: false,
    authToken: null,
    vendorId: null,
    onboardingComplete: false,
  });

  useEffect(() => {
    async function bootstrap() {
      const [authToken, vendorId, onboardingComplete] = await Promise.all([
        getStoredAuthToken(),
        getStoredVendorId(),
        getStoredOnboardingComplete(),
      ]);

      setState({
        ready: true,
        authToken,
        vendorId,
        onboardingComplete,
      });
    }

    bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      async signIn({ token, vendorId = null, onboardingComplete = false }) {
        await Promise.all([
          setStoredAuthToken(token),
          setStoredVendorId(vendorId),
          setStoredOnboardingComplete(onboardingComplete),
        ]);
        setState((prev) => ({
          ...prev,
          authToken: token,
          vendorId,
          onboardingComplete,
        }));
      },
      async completeOnboarding(vendorId) {
        await Promise.all([
          setStoredVendorId(vendorId),
          setStoredOnboardingComplete(true),
        ]);
        setState((prev) => ({
          ...prev,
          vendorId,
          onboardingComplete: true,
        }));
      },
      async signOut() {
        await clearStoredSession();
        setState({
          ready: true,
          authToken: null,
          vendorId: null,
          onboardingComplete: false,
        });
      },
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
