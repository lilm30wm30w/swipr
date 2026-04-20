import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { Match } from '../types';

interface MatchesContextType {
  unseenCount: number;
  latestNewMatch: Match | null;
  markAllSeen: () => Promise<void>;
  clearLatestNewMatch: () => void;
  refreshUnseen: () => Promise<void>;
}

const MatchesContext = createContext<MatchesContextType>({
  unseenCount: 0,
  latestNewMatch: null,
  markAllSeen: async () => {},
  clearLatestNewMatch: () => {},
  refreshUnseen: async () => {},
});

export function MatchesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unseenCount, setUnseenCount] = useState(0);
  const [latestNewMatch, setLatestNewMatch] = useState<Match | null>(null);
  const userIdRef = useRef<string | null>(null);

  const refreshUnseen = useCallback(async () => {
    if (!user) { setUnseenCount(0); return; }
    const [{ count: c1 }, { count: c2 }] = await Promise.all([
      supabase.from('matches').select('id', { count: 'exact', head: true })
        .eq('user1_id', user.id).eq('user1_seen', false),
      supabase.from('matches').select('id', { count: 'exact', head: true })
        .eq('user2_id', user.id).eq('user2_seen', false),
    ]);
    setUnseenCount((c1 ?? 0) + (c2 ?? 0));
  }, [user]);

  const markAllSeen = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      supabase.from('matches').update({ user1_seen: true })
        .eq('user1_id', user.id).eq('user1_seen', false),
      supabase.from('matches').update({ user2_seen: true })
        .eq('user2_id', user.id).eq('user2_seen', false),
    ]);
    setUnseenCount(0);
  }, [user]);

  const clearLatestNewMatch = useCallback(() => setLatestNewMatch(null), []);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
    if (!user) { setUnseenCount(0); setLatestNewMatch(null); return; }
    refreshUnseen();

    const channel = supabase
      .channel(`matches-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `user1_id=eq.${user.id}` },
        (payload) => { setLatestNewMatch(payload.new as Match); refreshUnseen(); })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `user2_id=eq.${user.id}` },
        (payload) => { setLatestNewMatch(payload.new as Match); refreshUnseen(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, refreshUnseen]);

  return (
    <MatchesContext.Provider value={{ unseenCount, latestNewMatch, markAllSeen, clearLatestNewMatch, refreshUnseen }}>
      {children}
    </MatchesContext.Provider>
  );
}

export const useMatches = () => useContext(MatchesContext);
