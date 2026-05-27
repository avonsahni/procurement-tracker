"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import Dashboard from "@/components/Dashboard";
import BudgetAnalytics from "@/components/BudgetAnalytics";
import AdminPanel from "@/components/AdminPanel";
import LoginForm from "@/components/auth/LoginForm";

type View = "dashboard" | "budget-analytics" | "admin";

export default function Home() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>("dashboard");

  if (loading) return null;
  if (!user) return <LoginForm />;

  if (view === "budget-analytics") {
    return (
      <main className="min-h-screen bg-slate-50">
        <BudgetAnalytics onBack={() => setView("dashboard")} />
      </main>
    );
  }

  if (view === "admin") {
    return (
      <main className="min-h-screen bg-slate-50">
        <AdminPanel onBack={() => setView("dashboard")} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Dashboard
        onShowBudgetAnalytics={() => setView("budget-analytics")}
        onShowAdmin={() => setView("admin")}
      />
    </main>
  );
}
