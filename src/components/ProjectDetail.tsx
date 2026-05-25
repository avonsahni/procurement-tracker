"use client";

import { useState, useEffect } from "react";
import {
  fetchProject,
  addPackage,
  deletePackage,
  updatePackage,
  punchAward,
  addVendor,
  updateVendor,
  deleteVendor,
  addRemark,
  addDocument,
  deleteDocument,
  addInvoice,
  deleteInvoice,
  fetchCategories
} from "@/lib/store";
import { STAGES, CURRENCY_SYMBOLS, formatCurrency } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthContext";
import StageStepper from "@/components/StageStepper";
import VendorMatrix from "@/components/VendorMatrix";
import AuditTrail from "@/components/AuditTrail";
import RemarksSection from "@/components/RemarksSection";
import DocumentsSection from "@/components/DocumentsSection";
import BillingSection from "@/components/BillingSection";
import {
  ArrowLeft, Plus, Briefcase, Package, ChevronDown, Trash2, X,
  Clock, CheckCircle2, Lock, Unlock, Search, Zap, Wrench, Hammer,
  Monitor, HardDrive, ChevronRight, Layers
} from "lucide-react";

// ─── Category helpers ────────────────────────────────────────────────────────

function getCategoryIcon(cat: string, size = "w-5 h-5") {
  const c = (cat || "").toLowerCase();
  if (c.includes("elect")) return <Zap className={`${size} text-amber-500`} />;
  if (c.includes("mech") || c.includes("hvac") || c.includes("plumb")) return <Wrench className={`${size} text-blue-600`} />;
  if (c.includes("civil") || c.includes("struct") || c.includes("paint")) return <Hammer className={`${size} text-emerald-600`} />;
  if (c.includes("it") || c.includes("soft") || c.includes("network")) return <Monitor className={`${size} text-violet-600`} />;
  return <Package className={`${size} text-slate-400`} />;
}

const catBg: Record<string, string> = {
  amber: "bg-amber-50 border-amber-200",
  blue: "bg-blue-50 border-blue-200",
  emerald: "bg-emerald-50 border-emerald-200",
  violet: "bg-violet-50 border-violet-200",
  slate: "bg-slate-50 border-slate-200",
};

function getCategoryAccent(cat: string) {
  const c = (cat || "").toLowerCase();
  if (c.includes("elect")) return "amber";
  if (c.includes("mech") || c.includes("hvac") || c.includes("plumb")) return "blue";
  if (c.includes("civil") || c.includes("struct") || c.includes("paint")) return "emerald";
  if (c.includes("it") || c.includes("soft") || c.includes("network")) return "violet";
  return "slate";
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ProjectDetail({ projectId, onBack }: any) {
  const { user, editMode, setEditMode } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation state
  const [activeCat, setActiveCat] = useState<string | null>(null); // null = category grid

  // Package state
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const [showAddPkg, setShowAddPkg] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("All");
  const [filterAwardStatus, setFilterAwardStatus] = useState("All");
  const [newPkg, setNewPkg] = useState({ name: "", category: "", origin: "Domestic", currency: "INR" });
  const [punchingAward, setPunchingAward] = useState<any>(null);
  const [awardVal, setAwardVal] = useState("");
  const [awardVendor, setAwardVendor] = useState("");
  const [awardError, setAwardError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [proj, cats] = await Promise.all([fetchProject(projectId), fetchCategories()]);
      setProject(proj);
      setCategories(cats);
      if (cats.length > 0) setNewPkg(prev => ({ ...prev, category: prev.category || cats[0] }));
    } catch (e) {
      console.error("Failed to load project", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <div className="text-xs text-slate-500">Loading project…</div>
      </div>
    );
  }
  if (!project) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 bg-slate-50">
      Project not found.
    </div>
  );

  // ── Derived stats ──────────────────────────────────────────────────────────
  const awardedTotal = project.packages.reduce((s: any, p: any) => s + (p.awardValue || 0), 0);
  const remainingBudget = project.budget - awardedTotal;
  const awardPercent = project.budget > 0 ? (awardedTotal / project.budget) : 0;

  // All categories that actually have packages in this project
  const projectCategories = Array.from(
    new Set(project.packages.map((p: any) => p.category || "Uncategorised"))
  ) as string[];

  // Category stats map
  const catStats = projectCategories.reduce((acc: any, cat: string) => {
    const pkgs = project.packages.filter((p: any) => (p.category || "Uncategorised") === cat);
    const awardedPkgs = pkgs.filter((p: any) => p.currentStage === "Award");
    acc[cat] = {
      total: pkgs.length,
      awardedCount: awardedPkgs.length,
      awardedValue: awardedPkgs.reduce((s: any, p: any) => s + (p.awardValue || 0), 0),
      inProgress: pkgs.filter((p: any) => p.currentStage !== "Award").length,
    };
    return acc;
  }, {});

  // Packages shown in the active category view (with search/stage/award filters)
  const catPackages = activeCat
    ? project.packages.filter((p: any) => {
        const isAwarded = p.currentStage === "Award";
        return (
          (p.category || "Uncategorised") === activeCat &&
          p.name.toLowerCase().includes(search.toLowerCase()) &&
          (filterStage === "All" || p.currentStage === filterStage) &&
          (filterAwardStatus === "All" ||
            (filterAwardStatus === "Awarded" && isAwarded) ||
            (filterAwardStatus === "Not Awarded" && !isAwarded))
        );
      })
    : [];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddPkg = async () => {
    if (!newPkg.name.trim()) return;
    await addPackage(projectId, newPkg);
    setShowAddPkg(false);
    loadData();
  };

  const handlePunchAward = async () => {
    if (!punchingAward || !awardVal || !awardVendor) return;
    setAwardError(null);
    try {
      await punchAward(projectId, punchingAward.id, parseFloat(awardVal), awardVendor, user?.fullName);
      setPunchingAward(null); setAwardVal(""); setAwardVendor(""); setAwardError(null);
      loadData();
    } catch (e: any) {
      setAwardError(e.message || "Award failed");
    }
  };

  const handleUpdateStage = async (pkgId: string, stage: string) => {
    if (!editMode) return;
    await updatePackage(pkgId, { currentStage: stage }, user?.fullName);
    loadData();
  };

  const handleDeletePkg = async (pkgId: string) => {
    if (!editMode) return;
    if (confirm("Delete package?")) { await deletePackage(pkgId); loadData(); }
  };

  const calculateLeadTime = (p: any) => {
    if (!p.rfqFloatDate) return null;
    const start = new Date(p.rfqFloatDate).getTime();
    const end = p.awardDate ? new Date(p.awardDate).getTime() : Date.now();
    const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return p.awardDate ? `${diff} days` : `${diff} days (live)`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={activeCat ? () => { setActiveCat(null); setExpandedPkg(null); setSearch(""); setFilterStage("All"); setFilterAwardStatus("All"); } : onBack}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"
              title={activeCat ? "Back to categories" : "Back to dashboard"}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 leading-none">{project.name}</h1>
              <p className="text-xs text-slate-500 mt-1">
                {activeCat
                  ? <><span className="text-slate-400">{project.client} /</span> <span className="text-slate-700 font-medium">{activeCat}</span></>
                  : <>{project.client} · {formatCurrency(project.budget)}</>
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.canEdit && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition ${
                  editMode ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {editMode ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {editMode ? "Edit Mode ON" : "Enter Edit Mode"}
              </button>
            )}
            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs border border-blue-200">
              {user?.fullName.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ── PROJECT ANALYTICS ──────────────────────────────────────────── */}
        {(() => {
          const total = project.packages.length;
          const awardedCount    = project.packages.filter((p: any) => p.currentStage === "Award").length;
          const inProgressCount = total - awardedCount;
          const awardedPct      = total > 0 ? (awardedCount / total) * 100 : 0;

          // Billed = sum of all invoices across all packages
          const billedTotal = project.packages.reduce(
            (s: number, pkg: any) => s + (pkg.invoices || []).reduce((ss: number, inv: any) => ss + inv.amount, 0), 0
          );
          const awardedNotBilled = Math.max(0, awardedTotal - billedTotal);
          const balance          = Math.max(0, project.budget - awardedTotal);
          const overrun          = awardedTotal > project.budget ? awardedTotal - project.budget : 0;
          const barBase          = overrun > 0 ? awardedTotal : project.budget; // denominator for bar widths

          const billedPct           = barBase > 0 ? Math.min(100, (billedTotal / barBase) * 100) : 0;
          const awardedNotBilledPct = barBase > 0 ? Math.min(100 - billedPct, (awardedNotBilled / barBase) * 100) : 0;
          const balancePct          = barBase > 0 ? Math.max(0, (balance / barBase) * 100) : 100;

          // Stage distribution
          const stageDist = STAGES.map(s => ({
            label: s,
            count: project.packages.filter((p: any) => p.currentStage === s).length,
            color: s === "Award" ? "bg-emerald-500"
              : s === "Commercial Negotiation" ? "bg-blue-700"
              : s === "Technical Negotiation"  ? "bg-blue-500"
              : s === "RFQ Float"              ? "bg-blue-400"
              : "bg-slate-300",
          }));

          return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 space-y-6">

          {/* Top row: label + status */}
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Project Analytics</p>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{project.status}</span>
          </div>

          {/* Two-column layout */}
          <div className="flex flex-col lg:flex-row gap-6">

            {/* LEFT: package status tiles + stage bar */}
            <div className="flex-1 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Package Status</h2>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Total</p>
                  <p className="text-2xl font-mono font-bold text-slate-900 leading-none">{total}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-[10px] text-emerald-600 uppercase tracking-wide mb-1">Awarded</p>
                  <p className="text-2xl font-mono font-bold text-emerald-700 leading-none">{awardedCount}</p>
                  <p className="text-[10px] text-emerald-500 mt-1">{awardedPct.toFixed(0)}% of total</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-[10px] text-blue-600 uppercase tracking-wide mb-1">In Progress</p>
                  <p className="text-2xl font-mono font-bold text-blue-700 leading-none">{inProgressCount}</p>
                  <p className="text-[10px] text-blue-400 mt-1">{total > 0 ? (100 - awardedPct).toFixed(0) : 0}% of total</p>
                </div>
              </div>

              {/* Stage distribution bar */}
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Stage Distribution</p>
                <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 gap-px">
                  {stageDist.map(s => s.count > 0 && (
                    <div key={s.label} className={`${s.color} transition-all duration-500`}
                      style={{ width: `${(s.count / total) * 100}%` }}
                      title={`${s.label}: ${s.count}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {stageDist.filter(s => s.count > 0).map(s => (
                    <div key={s.label} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.color}`} />
                      <span className="text-[10px] text-slate-500">{s.label}</span>
                      <span className="text-[10px] font-mono font-semibold text-slate-700">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Budget breakdown chart */}
            <div className="lg:w-80 xl:w-96 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 flex-shrink-0">
              <h2 className="text-sm font-semibold text-slate-900">Budget Breakdown</h2>

              {/* Stacked horizontal bar */}
              <div>
                <div className="flex h-5 w-full rounded-lg overflow-hidden gap-px">
                  {/* Billed segment */}
                  {billedPct > 0 && (
                    <div
                      className="bg-blue-700 flex items-center justify-center transition-all duration-700"
                      style={{ width: `${billedPct}%` }}
                      title={`Billed: ${formatCurrency(billedTotal)}`}
                    >
                      {billedPct > 8 && <span className="text-[9px] font-semibold text-white">{billedPct.toFixed(0)}%</span>}
                    </div>
                  )}
                  {/* Awarded-not-billed segment */}
                  {awardedNotBilledPct > 0 && (
                    <div
                      className="bg-emerald-500 flex items-center justify-center transition-all duration-700"
                      style={{ width: `${awardedNotBilledPct}%` }}
                      title={`Awarded (unbilled): ${formatCurrency(awardedNotBilled)}`}
                    >
                      {awardedNotBilledPct > 8 && <span className="text-[9px] font-semibold text-white">{awardedNotBilledPct.toFixed(0)}%</span>}
                    </div>
                  )}
                  {/* Balance segment */}
                  {balancePct > 0 && (
                    <div
                      className="bg-slate-200 flex items-center justify-center transition-all duration-700"
                      style={{ width: `${balancePct}%` }}
                      title={`Balance: ${formatCurrency(balance)}`}
                    >
                      {balancePct > 8 && <span className="text-[9px] font-medium text-slate-500">{balancePct.toFixed(0)}%</span>}
                    </div>
                  )}
                  {/* Overrun indicator */}
                  {overrun > 0 && (
                    <div className="bg-red-500 w-2 flex-shrink-0" title="Over budget" />
                  )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-blue-700" /><span className="text-[10px] text-slate-500">Billed</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-emerald-500" /><span className="text-[10px] text-slate-500">Awarded (unbilled)</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-slate-200 border border-slate-300" /><span className="text-[10px] text-slate-500">Balance</span></div>
                </div>
              </div>

              {/* 4 stat rows */}
              <div className="space-y-2.5 pt-1 border-t border-slate-200">
                {[
                  { label: "Budget",          value: project.budget,  sub: "Total contract budget",                        dot: "bg-slate-400",  valClass: "text-slate-800" },
                  { label: "Awarded",         value: awardedTotal,    sub: `${awardPercent > 0 ? (awardPercent*100).toFixed(1) : 0}% of budget`,          dot: "bg-emerald-500", valClass: "text-emerald-700" },
                  { label: "Billed",          value: billedTotal,     sub: awardedTotal > 0 ? `${((billedTotal/awardedTotal)*100).toFixed(1)}% of awarded` : "No invoices yet", dot: "bg-blue-700",   valClass: "text-blue-700" },
                  { label: "Balance",         value: balance,         sub: overrun > 0 ? `⚠ ${formatCurrency(overrun)} over budget` : "Available budget",  dot: overrun > 0 ? "bg-red-500" : "bg-slate-300", valClass: overrun > 0 ? "text-red-600" : "text-slate-700" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${row.dot}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 leading-none">{row.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{row.sub}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-mono font-semibold flex-shrink-0 ${row.valClass}`}>
                      {formatCurrency(row.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════
            VIEW A — CATEGORY CARDS GRID
        ════════════════════════════════════════════════════════════════════ */}
        {!activeCat && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                Categories
                <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">{projectCategories.length}</span>
              </h2>
              {editMode && (
                <button
                  onClick={() => setShowAddPkg(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" /> Add Package
                </button>
              )}
            </div>

            {projectCategories.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <HardDrive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-medium">No packages yet</p>
                {editMode && (
                  <button onClick={() => setShowAddPkg(true)} className="mt-4 text-blue-600 text-sm font-medium hover:underline">
                    + Add first package
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectCategories.map((cat) => {
                  const stats = catStats[cat];
                  const pct = stats.total > 0 ? (stats.awardedCount / stats.total) * 100 : 0;
                  const accent = getCategoryAccent(cat);

                  return (
                    <button
                      key={cat}
                      onClick={() => { setActiveCat(cat); setExpandedPkg(null); }}
                      className="group text-left bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl p-5 transition-all duration-200 flex flex-col gap-4"
                    >
                      {/* Icon + name */}
                      <div className="flex items-start justify-between">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${catBg[accent]}`}>
                          {getCategoryIcon(cat, "w-5 h-5")}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition mt-1" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-700 transition leading-snug">{cat}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{stats.total} package{stats.total !== 1 ? "s" : ""}</p>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-[10px] text-slate-400 mb-0.5">Awarded Value</p>
                          <p className="text-sm font-mono font-semibold text-emerald-600 leading-none">
                            {stats.awardedValue > 0 ? formatCurrency(stats.awardedValue) : "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 mb-0.5">Awarded</p>
                          <p className="text-sm font-mono font-semibold text-slate-700 leading-none">
                            {stats.awardedCount}<span className="text-slate-400 font-normal text-xs">/{stats.total}</span>
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{pct.toFixed(0)}% awarded</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VIEW B — PACKAGES IN SELECTED CATEGORY
        ════════════════════════════════════════════════════════════════════ */}
        {activeCat && (
          <>
            {/* Sub-header: breadcrumb + filters */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {/* Breadcrumb */}
              <button
                onClick={() => { setActiveCat(null); setExpandedPkg(null); setSearch(""); setFilterStage("All"); setFilterAwardStatus("All"); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition font-medium"
              >
                <Layers className="w-3.5 h-3.5" /> All Categories
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${catBg[getCategoryAccent(activeCat)]}`}>
                {getCategoryIcon(activeCat, "w-3.5 h-3.5")}
                <span>{activeCat}</span>
                <span className="text-slate-400 font-normal ml-0.5">· {catStats[activeCat]?.total} pkgs</span>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Filters */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition w-40"
                />
              </div>
              <select value={filterAwardStatus} onChange={e => setFilterAwardStatus(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="All">All Status</option>
                <option value="Awarded">Awarded</option>
                <option value="Not Awarded">Not Awarded</option>
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
            </div>

            {/* Package list */}
            <div className="space-y-3">
              {catPackages.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                  <HardDrive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No packages match filters</p>
                </div>
              ) : (
                catPackages.map((pkg: any) => {
                  const isExpanded = expandedPkg === pkg.id;
                  const isAwarded = pkg.currentStage === "Award";
                  const stageIdx = STAGES.indexOf(pkg.currentStage);
                  const progressPercent = ((stageIdx + 1) / STAGES.length) * 100;
                  const leadTime = calculateLeadTime(pkg);

                  return (
                    <div key={pkg.id} className={`bg-white rounded-xl border transition overflow-hidden ${
                      isExpanded ? "border-blue-300 shadow-sm" : isAwarded ? "border-emerald-200" : "border-slate-200 hover:border-slate-300"
                    }`}>
                      {/* Package row */}
                      <div className="p-4 cursor-pointer" onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex-1 min-w-[220px]">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-slate-900 text-sm leading-none">{pkg.name}</h3>
                              {isAwarded && (
                                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Awarded
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">{pkg.origin}</span>
                              {leadTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{leadTime}</span>}
                            </div>
                          </div>

                          <div className="flex-1 min-w-[200px] max-w-[400px]">
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isAwarded ? "bg-emerald-500" : "bg-blue-500"}`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{pkg.currentStage}</p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-slate-500 mb-0.5">Award Value</p>
                              <p className={`text-sm font-mono font-semibold leading-none ${isAwarded ? "text-emerald-600" : "text-slate-300"}`}>
                                {isAwarded ? formatCurrency(pkg.awardValue || 0, pkg.currency) : "—"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {editMode && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleDeletePkg(pkg.id); }}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <div className={`p-1.5 rounded-full transition ${isExpanded ? "bg-blue-600 text-white rotate-180" : "bg-slate-100 text-slate-500"}`}>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded package detail */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 p-5 bg-slate-50/40">
                          <div className="mb-6 bg-white p-5 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                              <p className="text-xs font-medium text-slate-600">Procurement Timeline</p>
                              {isAwarded && (
                                <p className="text-xs font-medium text-emerald-700">
                                  Awarded to {pkg.awardedVendorId} for {formatCurrency(pkg.awardValue || 0, pkg.currency)}
                                </p>
                              )}
                            </div>
                            <StageStepper
                              currentStage={pkg.currentStage}
                              readonly={!editMode}
                              onStageChange={(st: any) => {
                                if (st === "Award") { setPunchingAward(pkg); setAwardVal(pkg.awardValue?.toString() || ""); }
                                else { handleUpdateStage(pkg.id, st); }
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-6">
                            <VendorMatrix
                              vendors={pkg.vendors}
                              currency={pkg.currency}
                              awardedVendorId={pkg.awardedVendorId}
                              awardValue={pkg.awardValue}
                              readonly={!editMode}
                              onUpdate={async (vid: any, updates: any) => { await updateVendor(pkg.id, vid, updates); await loadData(); }}
                              onAdd={async (v: any) => { await addVendor(pkg.id, v, user?.fullName); await loadData(); }}
                              onDelete={async (vid: any) => { await deleteVendor(pkg.id, vid, user?.fullName); await loadData(); }}
                              onSelectWinner={(v: any) => { setPunchingAward(pkg); setAwardVendor(v.name); setAwardVal(v.revisedAmount.toString()); }}
                            />
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <RemarksSection remarks={pkg.remarks} readonly={!editMode} onAddRemark={async (t: any) => { await addRemark(pkg.id, t, user?.fullName); await loadData(); }} />
                              <DocumentsSection
                                documents={pkg.documents}
                                packageId={pkg.id}
                                userId={user?.id ?? ''}
                                readonly={!editMode}
                                onAddDocument={async (d) => { await addDocument(pkg.id, d, user?.fullName); await loadData(); }}
                                onDeleteDocument={async (did: string) => { await deleteDocument(pkg.id, did, user?.fullName); await loadData(); }}
                              />
                            </div>
                            {isAwarded && (
                              <BillingSection
                                invoices={pkg.invoices || []}
                                awardValue={pkg.awardValue || 0}
                                currency={pkg.currency}
                                readonly={!editMode}
                                onAddInvoice={async (inv) => { await addInvoice(pkg.id, inv); await loadData(); }}
                                onDeleteInvoice={async (iid) => { await deleteInvoice(pkg.id, iid); await loadData(); }}
                              />
                            )}
                            <AuditTrail entries={pkg.auditTrail} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* ── ADD PACKAGE MODAL ──────────────────────────────────────────────── */}
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
                <select
                  value={newPkg.category}
                  onChange={e => setNewPkg({ ...newPkg, category: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Package Name *</label>
                <input
                  value={newPkg.name}
                  onChange={e => setNewPkg({ ...newPkg, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  placeholder="e.g. Electrical Panels"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Origin</label>
                  <select value={newPkg.origin} onChange={e => setNewPkg({ ...newPkg, origin: e.target.value as any })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
                    <option value="Domestic">Domestic</option>
                    <option value="Import">Import</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Currency</label>
                  <select value={newPkg.currency} onChange={e => setNewPkg({ ...newPkg, currency: e.target.value as any })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
                    {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={handleAddPkg} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                Create Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AWARD MODAL ────────────────────────────────────────────────────── */}
      {punchingAward && (() => {
        // Available budget = project budget − all OTHER awarded packages
        const otherAwarded = project.packages
          .filter((p: any) => p.currentStage === "Award" && p.id !== punchingAward.id)
          .reduce((s: number, p: any) => s + (p.awardValue || 0), 0);
        const availableBudget = project.budget - otherAwarded;
        const enteredVal = parseFloat(awardVal) || 0;
        const wouldExceed = enteredVal > availableBudget;

        return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setPunchingAward(null); setAwardError(null); }}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-slate-900 mb-1">Award Package</h2>
            <p className="text-xs text-slate-500 mb-4">
              Final award details for <span className="font-medium">{punchingAward.name}</span>
            </p>

            {/* Budget availability banner */}
            <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 mb-4 text-xs ${
              availableBudget <= 0
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-emerald-50 border border-emerald-200 text-emerald-700"
            }`}>
              <span>Available budget</span>
              <span className="font-mono font-semibold">
                {availableBudget <= 0 ? "Budget fully committed" : formatCurrency(availableBudget)}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Award Value ({CURRENCY_SYMBOLS[punchingAward.currency as keyof typeof CURRENCY_SYMBOLS]})
                </label>
                <input
                  type="number"
                  value={awardVal}
                  onChange={e => { setAwardVal(e.target.value); setAwardError(null); }}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 font-mono transition ${
                    wouldExceed
                      ? "border-red-400 focus:ring-red-400/30 focus:border-red-500"
                      : "border-slate-200 focus:ring-blue-500/30 focus:border-blue-500"
                  }`}
                  autoFocus
                />
                {wouldExceed && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    ⚠ Exceeds available budget by {formatCurrency(enteredVal - availableBudget)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Awarded Vendor</label>
                <select
                  value={awardVendor}
                  onChange={e => setAwardVendor(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                >
                  <option value="">Select Vendor…</option>
                  {punchingAward.vendors.map((v: any) => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
            </div>

            {/* Server-side error */}
            {awardError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {awardError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setPunchingAward(null); setAwardError(null); }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePunchAward}
                disabled={wouldExceed || availableBudget <= 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
              >
                Confirm Award
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
