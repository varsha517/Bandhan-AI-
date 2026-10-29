import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Guard against StrictMode double-mount firing duplicate getSession calls
  const initializedRef = useRef(false);

  useEffect(() => {
    // Subscribe to auth state changes first so we don't miss events
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    // Only call getSession once even under StrictMode double-mount
    if (!initializedRef.current) {
      initializedRef.current = true;
      supabase.auth.getSession().then(({ data }) => {
        // onAuthStateChange may have already set session; only hydrate when state is still empty
        setSession((current) => current ?? data.session);
        setUser((current) => current ?? data.session?.user ?? null);
        setLoading(false);
      });
    }

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes('rate') || error.status === 429) {
          return { error: 'Too many login attempts. Please wait a few minutes and try again.' };
        }
        return { error: error.message };
      }
      return { error: null };
    } catch (e) {
      return { error: 'Network error. Please check your connection and try again.' };
    }
  };

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        if (
          error.message.toLowerCase().includes('rate') ||
          error.message.toLowerCase().includes('email rate') ||
          error.status === 429
        ) {
          return {
            error:
              'Email rate limit reached. Please wait a few minutes before signing up again, or try signing in if you already have an account.',
          };
        }
        return { error: error.message };
      }
      // Only call seed_demo_data if user was actually created (not just "check email" flow)
      if (data.user && data.session) {
        // User is confirmed immediately (email confirmation disabled)
        try {
          await supabase.rpc('seed_demo_data');
        } catch {
          // Non-fatal: seed_demo_data may not exist or may have already run
        }
      }
      return { error: null };
    } catch (e) {
      return { error: 'Network error. Please check your connection and try again.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
