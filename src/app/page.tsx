"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import Dashboard from "@/components/Dashboard";
import BudgetAnalytics from "@/components/BudgetAnalytics";
import AdminPanel from "@/components/AdminPanel";
import PlatformPanel from "@/components/PlatformPanel";
import LoginForm from "@/components/auth/LoginForm";
import SubscriptionGate from "@/components/SubscriptionGate";

type View = "dashboard" | "budget-analytics" | "admin" | "platform";

export default function Home() {
  const { user, loading, isOrgBlocked } = useAuth();
  const [view, setView] = useState<View>("dashboard");

  if (loading) return null;
  if (!user) return <LoginForm />;
  if (isOrgBlocked) return <SubscriptionGate />;

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

  if (view === "platform") {
    return (
      <main className="min-h-screen bg-slate-50">
        <PlatformPanel onBack={() => setView("dashboard")} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Dashboard
        onShowBudgetAnalytics={() => setView("budget-analytics")}
        onShowAdmin={() => setView("admin")}
        onShowPlatform={() => setView("platform")}
      />
    </main>
  );
}
