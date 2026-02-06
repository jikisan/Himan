import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@core/infrastructure/config';
import { Logger } from '@core/infrastructure/services';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    } catch (error) {
      Logger.error('Error checking session', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Use 'local' scope for OAuth compatibility
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
    } catch (error) {
      Logger.error('Error signing out', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener FIRST
    // This handles OAuth callbacks and session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        Logger.info('Auth state changed', { event, hasSession: !!session });
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session after listener is set up
    const initializeAuth = async () => {
      try {
        // First, check if there are OAuth params in the URL that need processing
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        const hasAuthParams = hashParams.has('access_token') || queryParams.has('code');

        if (hasAuthParams) {
          // Let onAuthStateChange handle the OAuth callback
          // It will set loading to false when done
          Logger.info('OAuth params detected, waiting for auth state change');
          return;
        }

        // No OAuth params, check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        Logger.error('Error initializing auth', error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    signOut,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
