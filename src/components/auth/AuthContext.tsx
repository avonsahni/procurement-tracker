"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUsers, UserAccount } from "@/lib/store";

interface AuthContextType {
  user: UserAccount | null;
  loading: boolean;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("procurement_session_active");
    if (saved) {
        const users = getUsers();
        const found = users.find(u => u.id === saved);
        if (found) setUser(found);
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const users = getUsers();
    const found = users.find(u => u.username === username && u.password === password);
    
    if (found) {
      setUser(found);
      localStorage.setItem("procurement_session_active", found.id);
    } else {
      throw new Error("Invalid credentials");
    }
  };

  const logout = async () => {
    setUser(null);
    setEditMode(false);
    localStorage.removeItem("procurement_session_active");
  };

  return (
    <AuthContext.Provider value={{ user, loading, editMode, setEditMode, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
