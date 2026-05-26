"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchProject, addPackage, deletePackage, fetchCategories } from "@/lib/store";
import { STAGES, CURRENCY_SYMBOLS, formatCurrency, EXECUTION_MILESTONES } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthContext";
import UserMenu from "@/components/UserMenu";
import {
  ArrowLeft, Plus, Briefcase, Package, Trash2, X,
  Clock, CheckCircle2, Lock, Unlock, Search,
  ShoppingCart, Activity, ChevronRight, ArrowRight,
  HardDrive, TrendingUp, Receipt, Target,
} from "lucide-react";

type View = "landing" | "purchasing" | "execution";

// ─── helpers ────────────────────────────────────────────────────────────────

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function StatTile({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className={`rounded-xl p-4 border ${accent}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-current opacity-60 mb-1">{label}</p>
      <p className="text-2xl font-mono font-bold leading-none">{value}</p>
      {sub && <p className="text-[10px] mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function ProjectDetail({ projectId, onBack }: any) {
  const { user, editMode, setEditMode } = useAuth();
  const router = useRouter();

  const [project, setProject]     = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<View>("landing");

  // filters shared across both detail views
  const [search, setSearch]       = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterStage, setFilterStage] = useState("All");

  const [showAddPkg, setShowAddPkg] = useState(false);
  const [newPkg, setNewPkg] = useState({ name: "", category: "", origin: "Domestic", currency: "INR" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [proj, cats] = await Promise.all([fetchProject(projectId), fetchCategories()]);
      setProject(proj);
      setCategories(cats);
      if (cats.length > 0) setNewPkg(p => ({ ...p, category: p.category || cats[0] }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [projectId]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-xs text-slate-500">Loading project…</p>
    </div>
  );
  if (!project) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 bg-slate-50">Project not found.</div>
  );

  // ── derived values ──────────────────────────────────────────────────────────
  const allPkgs      = project.packages as any[];
  const awardedPkgs  = allPkgs.filter(p => p.currentStage === "Award");
  const inProgPkgs   = allPkgs.filter(p => p.currentStage !== "Award");

  const totalAwarded    = awardedPkgs.reduce((s: number, p: any) => s + (p.awardValue || 0), 0);
  const totalBilled     = allPkgs.reduce((s: number, p: any) => s + (p.billedAmount || 0), 0);
  const balance         = Math.max(0, project.budget - totalAwarded);
  const awardedNotBill  = Math.max(0, totalAwarded - totalBilled);
  const overrun         = totalAwarded > project.budget ? totalAwarded - project.budget : 0;

  const exMilestonesSum   = awardedPkgs.reduce((s: number, p: any) => s + (p.milestonesProgressSum || 0), 0);
  const exMilestonesTotal = awardedPkgs.reduce((s: number, p: any) => s + (p.totalMilestones || 0), 0);
  const exMilestonePct    = exMilestonesTotal > 0 ? exMilestonesSum / exMilestonesTotal : 0;
  const exFinancialPct    = totalAwarded > 0 ? Math.min(100, (totalBilled / totalAwarded) * 100) : 0;
  const awardPct          = project.budget > 0 ? Math.min(100, (totalAwarded / project.budget) * 100) : 0;

  const projectCats = Array.from(new Set(allPkgs.map((p: any) => p.category || "Uncategorised"))) as string[];

  // stage distribution
  const stageDist = STAGES.map(s => ({
    label: s, count: allPkgs.filter((p: any) => p.currentStage === s).length,
    color: s === "Award" ? "bg-emerald-500" : s === "Commercial Negotiation" ? "bg-blue-700"
         : s === "Technical Negotiation" ? "bg-blue-500" : s === "RFQ Float" ? "bg-blue-400" : "bg-slate-300",
  }));

  // budget bar widths
  const barBase     = overrun > 0 ? totalAwarded : project.budget;
  const billedPct   = barBase > 0 ? Math.min(100, (totalBilled / barBase) * 100) : 0;
  const unbilledPct = barBase > 0 ? Math.min(100 - billedPct, (awardedNotBill / barBase) * 100) : 0;
  const balancePct  = barBase > 0 ? Math.max(0, (balance / barBase) * 100) : 100;

  // ── filtered package lists ─────────────────────────────────────────────────
  const filteredPurchasing = allPkgs.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterCat === "All" || (p.category || "Uncategorised") === filterCat) &&
    (filterStage === "All" || p.currentStage === filterStage)
  );

  const filteredExecution = awardedPkgs.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterCat === "All" || (p.category || "Uncategorised") === filterCat)
  );

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleAddPkg = async () => {
    if (!newPkg.name.trim()) return;
    await addPackage(projectId, newPkg);
    setShowAddPkg(false);
    loadData();
  };

  const handleDeletePkg = async (pkgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editMode || !confirm("Delete package?")) return;
    await deletePackage(pkgId);
    loadData();
  };

  const openPackage = (pkgId: string) => router.push(`/projects/${projectId}/packages/${pkgId}`);

  const goBack = () => {
    if (view !== "landing") { setView("landing"); setSearch(""); setFilterCat("All"); setFilterStage("All"); }
    else onBack();
  };

  const stageDotColor = (stage: string) =>
    stage === "Award" ? "bg-emerald-500" : stage === "Commercial Negotiation" ? "bg-blue-700"
    : stage === "Technical Negotiation" ? "bg-blue-500" : stage === "RFQ Float" ? "bg-blue-400" : "bg-slate-400";

  const calculateLeadTime = (p: any) => {
    if (!p.rfqFloatDate) return null;
    const diff = Math.floor((p.awardDate ? new Date(p.awardDate).getTime() : Date.now()) - new Date(p.rfqFloatDate).getTime()) / 86400000;
    return p.awardDate ? `${Math.floor(diff)}d` : `${Math.floor(diff)}d (live)`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={goBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button onClick={() => router.push("/")} className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition flex-shrink-0" title="Home">
              <Briefcase className="w-5 h-5 text-white" />
            </button>
            <nav className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="font-semibold text-slate-900 truncate">{project.name}</span>
              {view !== "landing" && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                    view === "purchasing" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                  }`}>
                    {view === "purchasing" ? "Purchasing" : "Execution"}
                  </span>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {user?.canEdit && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition ${
                  editMode ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {editMode ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{editMode ? "Edit ON" : "Edit Mode"}</span>
              </button>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ══════════════════════════════════════════════════════════════════════
            LANDING — two dashboard entry cards
        ══════════════════════════════════════════════════════════════════════ */}
        {view === "landing" && (
          <>
            {/* Project meta */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${
                  project.status === "Active" ? "bg-blue-50 text-blue-700 ring-blue-200"
                  : project.status === "On Hold" ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-slate-100 text-slate-600 ring-slate-200"
                }`}>{project.status}</span>
                <span className="text-xs text-slate-400">{project.client}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
              <p className="text-sm text-slate-500 mt-1">Budget {formatCurrency(project.budget)} · {allPkgs.length} packages</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── Purchasing Dashboard card ─────────────────────────────── */}
              <button
                onClick={() => setView("purchasing")}
                className="group text-left bg-white border border-slate-200 hover:border-blue-400 hover:shadow-lg rounded-2xl p-6 transition-all duration-200 flex flex-col gap-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 group-hover:text-blue-700 transition">Purchasing Dashboard</h2>
                      <p className="text-xs text-slate-500">Procurement pipeline &amp; package status</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition mt-1 flex-shrink-0" />
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-slate-500 mb-1">Total</p>
                    <p className="text-xl font-mono font-bold text-slate-900">{allPkgs.length}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-emerald-600 mb-1">Awarded</p>
                    <p className="text-xl font-mono font-bold text-emerald-700">{awardedPkgs.length}</p>
                    <p className="text-[10px] text-emerald-500">{awardPct.toFixed(0)}%</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-blue-600 mb-1">In Progress</p>
                    <p className="text-xl font-mono font-bold text-blue-700">{inProgPkgs.length}</p>
                  </div>
                </div>

                {/* Stage bar */}
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Stage Distribution</p>
                  <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100 gap-px">
                    {stageDist.map(s => s.count > 0 && (
                      <div key={s.label} className={`${s.color} transition-all duration-500`}
                        style={{ width: `${(s.count / allPkgs.length) * 100}%` }}
                        title={`${s.label}: ${s.count}`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {stageDist.filter(s => s.count > 0).map(s => (
                      <span key={s.label} className="flex items-center gap-1 text-[10px] text-slate-500">
                        <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />{s.label} <span className="font-mono">{s.count}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Budget summary */}
                <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-slate-400">Awarded Value</p>
                    <p className="text-sm font-mono font-semibold text-emerald-700">{formatCurrency(totalAwarded)}</p>
                    <p className="text-[10px] text-slate-400">{awardPct.toFixed(1)}% of budget</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Budget Remaining</p>
                    <p className={`text-sm font-mono font-semibold ${overrun > 0 ? "text-red-600" : "text-slate-700"}`}>{formatCurrency(balance)}</p>
                    {overrun > 0 && <p className="text-[10px] text-red-500">⚠ {formatCurrency(overrun)} over budget</p>}
                  </div>
                </div>

                <div className="w-full py-2.5 bg-blue-600 group-hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition">
                  Open Purchasing Dashboard <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* ── Execution Dashboard card ───────────────────────────────── */}
              <button
                onClick={() => setView("execution")}
                className="group text-left bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-lg rounded-2xl p-6 transition-all duration-200 flex flex-col gap-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center">
                      <Activity className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 group-hover:text-emerald-700 transition">Execution Dashboard</h2>
                      <p className="text-xs text-slate-500">Milestone &amp; financial progress tracking</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition mt-1 flex-shrink-0" />
                </div>

                {awardedPkgs.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                    <Activity className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No packages awarded yet</p>
                    <p className="text-xs text-slate-400 mt-1">Award packages to start tracking execution</p>
                  </div>
                ) : (
                  <>
                    {/* Stat tiles */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-emerald-600 mb-1">In Execution</p>
                        <p className="text-xl font-mono font-bold text-emerald-700">{awardedPkgs.length}</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-blue-600 mb-1">Milestones</p>
                        <p className="text-xl font-mono font-bold text-blue-700">{exMilestonePct.toFixed(0)}%</p>
                      </div>
                      <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-violet-600 mb-1">Financial</p>
                        <p className="text-xl font-mono font-bold text-violet-700">{exFinancialPct.toFixed(0)}%</p>
                      </div>
                    </div>

                    {/* Progress bars */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                          <span>Milestone Progress (avg)</span>
                          <span className="font-mono font-semibold">{exMilestonePct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${exMilestonePct}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                          <span>Financial Progress (billed / awarded)</span>
                          <span className="font-mono font-semibold">{exFinancialPct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${exFinancialPct}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Financial amounts */}
                    <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400">Total Awarded</p>
                        <p className="text-sm font-mono font-semibold text-emerald-700">{formatCurrency(totalAwarded)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Total Billed</p>
                        <p className="text-sm font-mono font-semibold text-violet-700">{formatCurrency(totalBilled)}</p>
                      </div>
                    </div>
                  </>
                )}

                <div className={`w-full py-2.5 ${awardedPkgs.length === 0 ? "bg-slate-200 text-slate-500" : "bg-emerald-600 group-hover:bg-emerald-700 text-white"} rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition`}>
                  Open Execution Dashboard <ArrowRight className="w-4 h-4" />
                </div>
              </button>

            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PURCHASING DASHBOARD
        ══════════════════════════════════════════════════════════════════════ */}
        {view === "purchasing" && (
          <>
            {/* ── Stats + charts block ─────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 space-y-6">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Purchasing Dashboard</p>
                <span className="text-xs text-slate-400">· {project.client}</span>
              </div>

              {/* 4 stat tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-slate-500 mb-1">Total Packages</p>
                  <p className="text-2xl font-mono font-bold text-slate-900">{allPkgs.length}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-emerald-600 mb-1">Awarded</p>
                  <p className="text-2xl font-mono font-bold text-emerald-700">{awardedPkgs.length}</p>
                  <p className="text-[10px] text-emerald-500">{awardPct.toFixed(0)}% of total</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-blue-600 mb-1">In Progress</p>
                  <p className="text-2xl font-mono font-bold text-blue-700">{inProgPkgs.length}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-slate-500 mb-1">Budget Balance</p>
                  <p className={`text-2xl font-mono font-bold ${overrun > 0 ? "text-red-600" : "text-slate-900"}`}>{formatCurrency(balance)}</p>
                  {overrun > 0 && <p className="text-[10px] text-red-500">Over budget</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stage distribution */}
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-3">Stage Distribution</p>
                  <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-100 gap-px mb-3">
                    {stageDist.map(s => s.count > 0 && (
                      <div key={s.label} className={`${s.color} flex items-center justify-center`}
                        style={{ width: `${(s.count / allPkgs.length) * 100}%` }}
                        title={`${s.label}: ${s.count}`}
                      >
                        {(s.count / allPkgs.length) * 100 > 10 && (
                          <span className="text-[9px] font-semibold text-white">{s.count}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {stageDist.map(s => (
                      <div key={s.label} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${s.color}`} />
                        <span className="text-xs text-slate-600">{s.label}</span>
                        <span className="text-xs font-mono font-semibold text-slate-700">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Budget breakdown */}
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-3">Budget Breakdown</p>
                  <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-100 gap-px mb-3">
                    {billedPct > 0 && (
                      <div className="bg-violet-600 flex items-center justify-center" style={{ width: `${billedPct}%` }} title={`Billed: ${formatCurrency(totalBilled)}`}>
                        {billedPct > 8 && <span className="text-[9px] font-semibold text-white">{billedPct.toFixed(0)}%</span>}
                      </div>
                    )}
                    {unbilledPct > 0 && (
                      <div className="bg-emerald-500 flex items-center justify-center" style={{ width: `${unbilledPct}%` }} title={`Awarded (unbilled): ${formatCurrency(awardedNotBill)}`}>
                        {unbilledPct > 8 && <span className="text-[9px] font-semibold text-white">{unbilledPct.toFixed(0)}%</span>}
                      </div>
                    )}
                    {balancePct > 0 && (
                      <div className="bg-slate-200 flex items-center justify-center" style={{ width: `${balancePct}%` }}>
                        {balancePct > 8 && <span className="text-[9px] text-slate-500">{balancePct.toFixed(0)}%</span>}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Budget", val: project.budget, cls: "text-slate-800", dot: "bg-slate-300" },
                      { label: "Awarded", val: totalAwarded, cls: "text-emerald-700", dot: "bg-emerald-500" },
                      { label: "Billed", val: totalBilled, cls: "text-violet-700", dot: "bg-violet-600" },
                      { label: "Balance", val: balance, cls: overrun > 0 ? "text-red-600" : "text-slate-700", dot: overrun > 0 ? "bg-red-500" : "bg-slate-200" },
                    ].map(r => (
                      <div key={r.label} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.dot}`} />
                        <span className="text-xs text-slate-500">{r.label}</span>
                        <span className={`text-xs font-mono font-semibold ml-auto ${r.cls}`}>{formatCurrency(r.val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Filters + package list ───────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="relative flex-1 min-w-40">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input placeholder="Search packages…" value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 text-xs w-full bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition" />
              </div>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="All">All Categories</option>
                {projectCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="All">All Stages</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {editMode && (
                <button onClick={() => setShowAddPkg(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition">
                  <Plus className="w-3.5 h-3.5" /> Add Package
                </button>
              )}
              <span className="text-xs text-slate-400 ml-1">{filteredPurchasing.length} packages</span>
            </div>

            {filteredPurchasing.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <HardDrive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No packages match filters</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60">
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 w-8">#</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500">Package</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 hidden md:table-cell">Category</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500">Stage</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 text-center hidden sm:table-cell">Vendors</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500">Award Value</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 hidden lg:table-cell">Lead Time</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchasing.map((pkg: any, idx: number) => {
                      const isAwarded   = pkg.currentStage === "Award";
                      const stageIdx    = STAGES.indexOf(pkg.currentStage);
                      const progressPct = ((stageIdx + 1) / STAGES.length) * 100;
                      const leadTime    = calculateLeadTime(pkg);
                      return (
                        <tr key={pkg.id} onClick={() => openPackage(pkg.id)}
                          className={`border-b border-slate-100 last:border-0 cursor-pointer hover:bg-blue-50/40 transition group ${isAwarded ? "bg-emerald-50/20" : ""}`}>
                          <td className="px-4 py-3.5"><span className="text-xs font-mono text-slate-400">{idx + 1}</span></td>
                          <td className="px-4 py-3.5">
                            <p className="text-sm font-semibold text-slate-900 leading-none">{pkg.name}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">{pkg.origin}</span>
                              <span className="text-[10px] text-slate-400">{pkg.currency}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <span className="text-xs text-slate-600">{pkg.category || "—"}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stageDotColor(pkg.currentStage)}`} />
                              <div>
                                <p className="text-xs font-medium text-slate-700 whitespace-nowrap leading-none">
                                  {isAwarded ? <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Awarded</span> : pkg.currentStage}
                                </p>
                                <MiniBar pct={progressPct} color={isAwarded ? "bg-emerald-500" : "bg-blue-500"} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${(pkg.vendorCount || 0) > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                              {pkg.vendorCount || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {isAwarded
                              ? <span className="text-sm font-mono font-semibold text-emerald-700">{formatCurrency(pkg.awardValue || 0, pkg.currency)}</span>
                              : <span className="text-sm text-slate-300 font-mono">—</span>}
                          </td>
                          <td className="px-4 py-3.5 hidden lg:table-cell">
                            {leadTime
                              ? <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3 flex-shrink-0" />{leadTime}</span>
                              : <span className="text-xs text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              {editMode && (
                                <button onClick={e => handleDeletePkg(pkg.id, e)}
                                  className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <div className="p-1.5 text-slate-300 group-hover:text-blue-600 transition"><ArrowRight className="w-3.5 h-3.5" /></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            EXECUTION DASHBOARD
        ══════════════════════════════════════════════════════════════════════ */}
        {view === "execution" && (
          <>
            {/* ── Stats + charts block ─────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 space-y-6">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Execution Dashboard</p>
                <span className="text-xs text-slate-400">· awarded packages only</span>
              </div>

              {awardedPkgs.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm font-medium">No packages awarded yet</p>
                  <p className="text-xs text-slate-400 mt-1">Go to the Purchasing Dashboard to award packages</p>
                </div>
              ) : (
                <>
                  {/* 4 stat tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                      <p className="text-[10px] text-emerald-600 mb-1">In Execution</p>
                      <p className="text-2xl font-mono font-bold text-emerald-700">{awardedPkgs.length}</p>
                      <p className="text-[10px] text-emerald-500">packages</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                      <p className="text-[10px] text-blue-600 mb-1">Milestone Avg</p>
                      <p className="text-2xl font-mono font-bold text-blue-700">{exMilestonePct.toFixed(0)}%</p>
                    </div>
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-center">
                      <p className="text-[10px] text-violet-600 mb-1">Financial</p>
                      <p className="text-2xl font-mono font-bold text-violet-700">{exFinancialPct.toFixed(0)}%</p>
                      <p className="text-[10px] text-violet-500">billed of awarded</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                      <p className="text-[10px] text-slate-500 mb-1">Total Billed</p>
                      <p className="text-lg font-mono font-bold text-slate-900">{formatCurrency(totalBilled)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Overall progress bars */}
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-slate-700">Overall Progress</p>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-slate-500 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-blue-500" />Milestone Progress</span>
                          <span className="font-mono font-semibold text-blue-700">{exMilestonePct.toFixed(1)}%</span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${exMilestonePct}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Average across all {EXECUTION_MILESTONES.length} milestones × {awardedPkgs.length} packages</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-slate-500 flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5 text-violet-500" />Financial Progress</span>
                          <span className="font-mono font-semibold text-violet-700">{exFinancialPct.toFixed(1)}%</span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${exFinancialPct}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{formatCurrency(totalBilled)} billed of {formatCurrency(totalAwarded)} awarded</p>
                      </div>
                    </div>

                    {/* Per-package financial snapshot */}
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-3">Package Snapshot</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {awardedPkgs.map((pkg: any) => {
                          const finPct = pkg.awardValue > 0 ? Math.min(100, ((pkg.billedAmount || 0) / pkg.awardValue) * 100) : 0;
                          const milPct = (pkg.totalMilestones || 0) > 0 ? (pkg.milestonesProgressSum || 0) / pkg.totalMilestones : 0;
                          return (
                            <div key={pkg.id} className="flex items-center gap-2">
                              <span className="text-xs text-slate-600 truncate flex-1 min-w-0">{pkg.name}</span>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-blue-400" style={{ width: `${milPct}%` }} />
                                </div>
                                <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-violet-400" style={{ width: `${finPct}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                        <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-2.5 h-1.5 rounded-sm bg-blue-400 inline-block" />Milestone</span>
                        <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-2.5 h-1.5 rounded-sm bg-violet-400 inline-block" />Financial</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Filters + execution package list ─────────────────────────── */}
            {awardedPkgs.length > 0 && (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="relative flex-1 min-w-40">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input placeholder="Search packages…" value={search} onChange={e => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-2 text-xs w-full bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition" />
                  </div>
                  <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30">
                    <option value="All">All Categories</option>
                    {projectCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="text-xs text-slate-400 ml-1">{filteredExecution.length} packages</span>
                </div>

                {filteredExecution.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <HardDrive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No packages match filters</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/60">
                          <th className="px-4 py-3 text-xs font-medium text-slate-500 w-8">#</th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-500">Package</th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-500 hidden md:table-cell">Category</th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-500">Award Value</th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-500">Billed</th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-500">Financial %</th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-500">Milestone %</th>
                          <th className="px-4 py-3 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExecution.map((pkg: any, idx: number) => {
                          const finPct = pkg.awardValue > 0 ? Math.min(100, ((pkg.billedAmount || 0) / pkg.awardValue) * 100) : 0;
                          const milPct = (pkg.totalMilestones || 0) > 0 ? (pkg.milestonesProgressSum || 0) / pkg.totalMilestones : 0;
                          return (
                            <tr key={pkg.id} onClick={() => openPackage(pkg.id)}
                              className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-emerald-50/30 transition group">
                              <td className="px-4 py-3.5"><span className="text-xs font-mono text-slate-400">{idx + 1}</span></td>
                              <td className="px-4 py-3.5">
                                <p className="text-sm font-semibold text-slate-900 leading-none">{pkg.name}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{pkg.awardedVendorId || "—"}</p>
                              </td>
                              <td className="px-4 py-3.5 hidden md:table-cell">
                                <span className="text-xs text-slate-600">{pkg.category || "—"}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="text-sm font-mono font-semibold text-emerald-700">{formatCurrency(pkg.awardValue || 0, pkg.currency)}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="text-sm font-mono text-violet-700">{formatCurrency(pkg.billedAmount || 0, pkg.currency)}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <MiniBar pct={finPct} color="bg-violet-500" />
                                  <span className="text-xs font-mono text-slate-600">{finPct.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <MiniBar pct={milPct} color={milPct >= 100 ? "bg-emerald-500" : "bg-blue-500"} />
                                  <span className="text-xs font-mono text-slate-600">{milPct.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="p-1.5 text-slate-300 group-hover:text-emerald-600 transition"><ArrowRight className="w-3.5 h-3.5" /></div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* ── ADD PACKAGE MODAL ─────────────────────────────────────────────────── */}
      {showAddPkg && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddPkg(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">New Package</h2>
              <button onClick={() => setShowAddPkg(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Category</label>
                <select value={newPkg.category} onChange={e => setNewPkg({ ...newPkg, category: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Package Name *</label>
                <input value={newPkg.name} onChange={e => setNewPkg({ ...newPkg, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  placeholder="e.g. Electrical Panels" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Origin</label>
                  <select value={newPkg.origin} onChange={e => setNewPkg({ ...newPkg, origin: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30">
                    <option value="Domestic">Domestic</option><option value="Import">Import</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Currency</label>
                  <select value={newPkg.currency} onChange={e => setNewPkg({ ...newPkg, currency: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30">
                    {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={handleAddPkg} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">Create Package</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
