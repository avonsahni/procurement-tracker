"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserAccount } from "@/lib/store";
import { apiFetch } from "@/lib/apiFetch";

interface AuthContextType {
  user: UserAccount | null;
  loading: boolean;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string, orgName?: string) => Promise<{ needsConfirmation: boolean }>;
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
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : { user: null })
      .then(data => { if (!cancelled) setUser(data.user ?? null); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Invalid credentials');
    }
    const userData: UserAccount = await res.json();
    setUser(userData);
  };

  const signup = async (email: string, password: string, fullName: string, orgName?: string) => {
    const res = await apiFetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, orgName }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Sign up failed');
    if (body.needsConfirmation) {
      return { needsConfirmation: true };
    }
    setUser(body as UserAccount);
    return { needsConfirmation: false };
  };

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
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

  return (
    <AuthContext.Provider value={{ user, loading, editMode, setEditMode, login, signup, logout, isOrgBlocked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
