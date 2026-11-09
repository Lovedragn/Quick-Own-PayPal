"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured, signOutUser } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(
    () => Boolean(isSupabaseConfigured && supabase),
  );
  const authEventVersion = useRef(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return undefined;
    }

    let mounted = true;
    const initialVersion = authEventVersion.current;

    // Subscribe before reading the persisted session so a SIGNED_IN event from
    // the OAuth callback cannot be overwritten by a late initial session read.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventVersion.current += 1;
      if (!mounted) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted || authEventVersion.current !== initialVersion) return;
        if (error) throw error;
        const currentSession = data?.session ?? null;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        if (!mounted) return;
        console.error("Could not restore Supabase session:", error);
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const { error } = await signOutUser();
    if (error) throw error;
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
