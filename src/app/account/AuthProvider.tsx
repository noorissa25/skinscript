"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addAvoid, getDisplayName, listAvoid, removeAvoid, setDisplayName as saveDisplayName } from "@/lib/accountApi";
import { getSupabase, isAccountsConfigured } from "@/lib/supabase";

interface AuthContextValue {
  /** False when Supabase keys aren't set: account and chat features stay hidden. */
  configured: boolean;
  ready: boolean;
  user: User | null;
  displayName: string | null;
  avoidIds: ReadonlySet<string>;
  sendSignInLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  toggleAvoid: (ingredientId: string) => Promise<void>;
  /** Opens the account dialog from anywhere (header, checker, chat). */
  openAccount: () => void;
  accountOpen: boolean;
  closeAccount: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isAccountsConfigured();
  // Created lazily in the browser; on the server this is null for the demo client.
  const supabase = typeof window === "undefined" ? null : getSupabase();
  // "ready" flips once the session is known, so the first render matches the server.
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [avoidIds, setAvoidIds] = useState<ReadonlySet<string>>(new Set());
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  // Load the person's display name and avoid list whenever they sign in.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear personal data the moment someone signs out
      setDisplayNameState(null);
      setAvoidIds(new Set());
      return;
    }
    let cancelled = false;
    Promise.all([getDisplayName(user.id), listAvoid()])
      .then(([name, avoid]) => {
        if (cancelled) return;
        setDisplayNameState(name);
        setAvoidIds(new Set(avoid));
      })
      .catch((err) => console.error("loading account failed", err));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const sendSignInLink = useCallback(
    async (email: string) => {
      if (!supabase) return;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (error) throw error;
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  const updateDisplayName = useCallback(
    async (name: string) => {
      if (!user) return;
      await saveDisplayName(user.id, name);
      setDisplayNameState(name.trim());
    },
    [user],
  );

  const toggleAvoid = useCallback(
    async (ingredientId: string) => {
      const has = avoidIds.has(ingredientId);
      // Update immediately, roll back if the database refuses.
      const next = new Set(avoidIds);
      if (has) next.delete(ingredientId);
      else next.add(ingredientId);
      setAvoidIds(next);
      try {
        await (has ? removeAvoid(ingredientId) : addAvoid(ingredientId));
      } catch (err) {
        console.error(err);
        setAvoidIds(avoidIds);
        throw err;
      }
    },
    [avoidIds],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      ready,
      user,
      displayName,
      avoidIds,
      sendSignInLink,
      signOut,
      updateDisplayName,
      toggleAvoid,
      accountOpen,
      openAccount: () => setAccountOpen(true),
      closeAccount: () => setAccountOpen(false),
    }),
    [configured, ready, user, displayName, avoidIds, sendSignInLink, signOut, updateDisplayName, toggleAvoid, accountOpen],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
