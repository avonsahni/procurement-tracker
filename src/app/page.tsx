"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import Dashboard from "@/components/Dashboard";
import BudgetAnalytics from "@/components/BudgetAnalytics";
import AdminPanel from "@/components/AdminPanel";
import PlatformPanel from "@/components/PlatformPanel";
import LandingPage from "@/components/LandingPage";
import ExpiryBanner from "@/components/ExpiryBanner";

type View = "dashboard" | "budget-analytics" | "admin" | "platform";

export default function Home() {
  const { user, loading, isOrgBlocked } = useAuth();
  const [view, setView] = useState<View>("dashboard");

  if (loading) return null;
  if (!user) return <LandingPage />;

  // When org is expired/blocked, clicking "Export Data" in the banner opens AdminPanel.
  const handleBannerExport = () => {
    if (user.role === "admin") setView("admin");
  };

  if (view === "budget-analytics") {
    return (
      <main className="min-h-screen bg-slate-50">
        {isOrgBlocked && <ExpiryBanner onExport={handleBannerExport} />}
        <BudgetAnalytics onBack={() => setView("dashboard")} />
      </main>
    );
  }

  if (view === "admin") {
    return (
      <main className="min-h-screen bg-slate-50">
        {isOrgBlocked && <ExpiryBanner onExport={handleBannerExport} />}
        <AdminPanel onBack={() => setView("dashboard")} />
      </main>
    );
  }

  if (view === "platform") {
    return (
      <main className="min-h-screen bg-slate-50">
        {isOrgBlocked && <ExpiryBanner onExport={handleBannerExport} />}
        <PlatformPanel onBack={() => setView("dashboard")} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {isOrgBlocked && <ExpiryBanner onExport={handleBannerExport} />}
      <Dashboard
        onShowBudgetAnalytics={() => setView("budget-analytics")}
        onShowAdmin={() => setView("admin")}
        onShowPlatform={() => setView("platform")}
      />
    </main>
  );
}
