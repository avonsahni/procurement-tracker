"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserAccount } from "@/lib/store";
import { apiFetch } from "@/lib/apiFetch";

// Marks the current browser tab as having an active login.
// sessionStorage is per-tab and is cleared automatically when the tab closes,
// so if this key is absent on mount but the server still has a session cookie,
// the user closed (or crashed) the tab and must log in again.
const TAB_KEY = 'ps_tab_active';

interface AuthContextType {
  user: UserAccount | null;
  loading: boolean;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  login: (email: string, password: string, opts?: { transfer?: boolean }) => Promise<void>;
  signup: (email: string, password: string, fullName: string, orgName?: string, extra?: Record<string, unknown>) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
  /** True when the org is paused, canceled, or the trial has expired */
  isOrgBlocked: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
        const data = r.ok ? await r.json() : { user: null };
        if (cancelled) return;

        if (data.user) {
          if (!sessionStorage.getItem(TAB_KEY)) {
            // Server session cookie exists but this tab never saw a login —
            // the user closed the previous tab and came back. Invalidate the
            // server session so they are forced to log in again.
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
            setUser(null);
          } else {
            setUser(data.user);
          }
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Heartbeat: while logged in, ping /api/auth/me periodically. This keeps the
  // single-session slot fresh for this (open) tab, and detects when the session
  // has been taken over elsewhere or revoked — in which case the server returns
  // no user and we drop the client into a logged-out state.
  useEffect(() => {
    if (!user) return;
    const HEARTBEAT_MS = 60_000;
    const id = setInterval(() => {
      fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(r => r.ok ? r.json() : { user: null })
        .then(data => {
          if (!data.user) { setUser(null); setEditMode(false); }
        })
        .catch(() => { /* network blip — keep current state */ });
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [user]);

  const login = async (email: string, password: string, opts?: { transfer?: boolean }) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, transfer: opts?.transfer ?? false }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body.error || 'Invalid credentials') as Error & { code?: string };
      err.code = body.code;
      throw err;
    }
    const userData: UserAccount = await res.json();
    sessionStorage.setItem(TAB_KEY, '1');
    setUser(userData);
  };

  const signup = async (email: string, password: string, fullName: string, orgName?: string, extra?: Record<string, unknown>) => {
    const res = await apiFetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, orgName, ...extra }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Sign up failed');
    if (body.needsConfirmation) {
      return { needsConfirmation: true };
    }
    sessionStorage.setItem(TAB_KEY, '1');
    setUser(body as UserAccount);
    return { needsConfirmation: false };
  };

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    sessionStorage.removeItem(TAB_KEY);
    setUser(null);
    setEditMode(false);
  };

  const isOrgBlocked = (() => {
    if (!user) return false;
    if (user.isPlatformAdmin) return false;
    if (user.orgStatus === 'paused' || user.orgStatus === 'canceled') return true;
    if (user.orgStatus === 'trial' && user.trialEndsAt) {
      return new Date(user.trialEndsAt) < new Date();
    }
    return false;
  })();

  // When the org is blocked, force read-only: editMode can never be true.
  const effectiveEditMode = isOrgBlocked ? false : editMode;
  const effectiveSetEditMode = isOrgBlocked ? (_: boolean) => {} : setEditMode;

  return (
    <AuthContext.Provider value={{ user, loading, editMode: effectiveEditMode, setEditMode: effectiveSetEditMode, login, signup, logout, isOrgBlocked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
