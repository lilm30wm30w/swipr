import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { removePushToken, syncPushToken } from '../lib/notifications';
import { Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  profileError: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pushTokenRef = useRef<string | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error || !data) {
        setProfile(null);
        setProfileError(error?.message ?? 'Profile not found');
        return;
      }
      setProfile(data ?? null);
      setProfileError(null);
    } catch {
      setProfile(null);
      setProfileError('Unable to load profile');
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  async function syncNotifications(nextUserId: string | null) {
    const previousUserId = previousUserIdRef.current;

    if (!nextUserId) {
      if (previousUserId && pushTokenRef.current) {
        await removePushToken(previousUserId, pushTokenRef.current);
      }
      pushTokenRef.current = null;
      previousUserIdRef.current = null;
      return;
    }

    const token = await syncPushToken(nextUserId);
    pushTokenRef.current = token;
    previousUserIdRef.current = nextUserId;
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setProfileError(null);
        if (session?.user) {
          await fetchProfile(session.user.id);
          await syncNotifications(session.user.id);
        } else {
          setProfile(null);
          await syncNotifications(null);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileError(null);
        syncNotifications(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      setSession(session);
      setUser(session?.user ?? null);
      setProfileError(null);
      if (session?.user) {
        fetchProfile(session.user.id)
          .then(() => syncNotifications(session.user.id))
          .finally(() => setLoading(false));
      } else {
        setProfile(null);
        syncNotifications(null).finally(() => setLoading(false));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    if (user && pushTokenRef.current) {
      await removePushToken(user.id, pushTokenRef.current);
      pushTokenRef.current = null;
      previousUserIdRef.current = null;
    }
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, profileError, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
