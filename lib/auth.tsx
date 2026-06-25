'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { Database } from './supabase';

type User = {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  language: 'en' | 'zh';
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ error: '' }),
  signUp: async () => ({ error: '' }),
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data;
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      setUser({
        id: session.user.id,
        email: session.user.email,
        display_name: profile?.display_name || session.user.user_metadata?.display_name || '',
        avatar_url: profile?.avatar_url || '',
        language: (profile?.language as 'en' | 'zh') || 'en',
      });
    } else {
      setUser(null);
    }
  }, [fetchProfile]);

  useEffect(() => {
    refreshUser();
    setLoading(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser({
            id: session.user.id,
            email: session.user.email,
            display_name: profile?.display_name || session.user.user_metadata?.display_name || '',
            avatar_url: profile?.avatar_url || '',
            language: (profile?.language as 'en' | 'zh') || 'en',
          });
        } else {
          setUser(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [refreshUser, fetchProfile]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || email.split('@')[0] } },
    });
    if (!error) {
      await supabase.from('profiles').insert({
        id: (await supabase.auth.getUser()).data.user?.id,
        display_name: displayName || email.split('@')[0],
        language: 'en',
      });
    }
    return { error: error?.message || null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
