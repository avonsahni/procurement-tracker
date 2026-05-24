"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import Dashboard from "@/components/Dashboard";
import ProjectDetail from "@/components/ProjectDetail";
import BudgetAnalytics from "@/components/BudgetAnalytics";
import UserManagement from "@/components/UserManagement";
import LoginForm from "@/components/auth/LoginForm";

type View = "dashboard" | "project" | "budget-analytics" | "user-management";

export default function Home() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (loading) return null;
  if (!user) return <LoginForm />;

  if (view === "project" && selectedProjectId) {
    return (
      <main className="min-h-screen bg-slate-50">
        <ProjectDetail
          projectId={selectedProjectId}
          onBack={() => { setView("dashboard"); setSelectedProjectId(null); }}
        />
      </main>
    );
  }

  if (view === "budget-analytics") {
    return (
      <main className="min-h-screen bg-slate-50">
        <BudgetAnalytics onBack={() => setView("dashboard")} />
      </main>
    );
  }

  if (view === "user-management") {
    return (
      <main className="min-h-screen bg-slate-50">
        <UserManagement onBack={() => setView("dashboard")} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Dashboard
        onSelectProject={(id: string) => { setSelectedProjectId(id); setView("project"); }}
        onShowBudgetAnalytics={() => setView("budget-analytics")}
        onShowUserManagement={() => setView("user-management")}
      />
    </main>
  );
}
