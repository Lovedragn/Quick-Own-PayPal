"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured, signOutUser } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(
    () => Boolean(isSupabaseConfigured && supabase),
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Get current session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen to auth state transitions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setSession(null);
  };

  return {
    user,
    session,
    loading,
    isConfigured: isSupabaseConfigured,
    signOut: handleSignOut,
  };
}

