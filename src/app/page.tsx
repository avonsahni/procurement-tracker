"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import Dashboard from "@/components/Dashboard";
import BudgetAnalytics from "@/components/BudgetAnalytics";
import AdminPanel from "@/components/AdminPanel";
import PlatformPanel from "@/components/PlatformPanel";
import LandingPage from "@/components/LandingPage";
import ExpiryBanner from "@/components/ExpiryBanner";

type View = "dashboard" | "budget-analytics" | "admin" | "platform";
const PANEL_VIEWS = new Set<string>(["budget-analytics", "admin", "platform"]);

function HomeInner() {
  const { user, loading, isOrgBlocked } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialise from the URL so that browser back/forward restores the right panel.
  const [view, setView] = useState<View>(() => {
    const v = searchParams.get("view") ?? "";
    return PANEL_VIEWS.has(v) ? (v as View) : "dashboard";
  });

  const goTo = (v: View) => {
    setView(v);
    // Push a real history entry so browser back returns here from child pages.
    router.push(v === "dashboard" ? "/" : `/?view=${v}`);
  };

  if (loading) return null;
  if (!user) return <LandingPage />;

  const handleBannerExport = () => {
    if (user.role === "admin") goTo("admin");
  };

  if (view === "budget-analytics") {
    return (
      <main className="min-h-screen bg-slate-50">
        {isOrgBlocked && <ExpiryBanner onExport={handleBannerExport} />}
        <BudgetAnalytics onBack={() => router.back()} />
      </main>
    );
  }

  if (view === "admin") {
    return (
      <main className="min-h-screen bg-slate-50">
        {isOrgBlocked && <ExpiryBanner onExport={handleBannerExport} />}
        <AdminPanel onBack={() => router.back()} />
      </main>
    );
  }

  if (view === "platform") {
    return (
      <main className="min-h-screen bg-slate-50">
        {isOrgBlocked && <ExpiryBanner onExport={handleBannerExport} />}
        <PlatformPanel onBack={() => router.back()} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {isOrgBlocked && <ExpiryBanner onExport={handleBannerExport} />}
      <Dashboard
        onShowBudgetAnalytics={() => goTo("budget-analytics")}
        onShowAdmin={() => goTo("admin")}
        onShowPlatform={() => goTo("platform")}
      />
    </main>
  );
}

export default function Home() {
  // Suspense is required by Next.js whenever useSearchParams is used in a
  // "use client" component — it prevents the SSR boundary from suspending.
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}
