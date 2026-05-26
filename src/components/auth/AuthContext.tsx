"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserAccount } from "@/lib/store";

interface AuthContextType {
  user: UserAccount | null;
  loading: boolean;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string, orgName?: string) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
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
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      credentials: 'same-origin',
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
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    setUser(null);
    setEditMode(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, editMode, setEditMode, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
