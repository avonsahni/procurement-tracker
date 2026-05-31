"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  fetchProjects,
  addProject,
  deleteProject,
  updateProject,
  fetchCategories,
  getCompanyInfo,
  CompanyInfo,
} from "@/lib/store";
import { formatCurrency, EXECUTION_MILESTONES } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthContext";
import UserMenu from "@/components/UserMenu";
import HelpGuide from "@/components/HelpGuide";
import {
  Plus, Trash2, Building2, X, FolderOpen, Activity, Settings, Tag, LogOut, Lock, Unlock, Users, Trash, Globe, Shield, Box, Layers, ChevronRight, Search, Edit2, BarChart3, ArrowRight, Receipt, HelpCircle, CheckCircle2, Target, Crown
} from "lucide-react";

const statusColors: Record<string, string> = {
  Active: "bg-blue-50 text-blue-700 ring-blue-200",
  "On Hold": "bg-amber-50 text-amber-700 ring-amber-200",
  Completed: "bg-slate-100 text-slate-600 ring-slate-200",
};

function ProjectBudgetCell({ project, onUpdate, editMode }: { project: any; onUpdate: (val: number) => void; editMode: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(project.budget.toString());

  useEffect(() => {
    setVal(project.budget.toString());
  }, [project.budget]);

  if (editMode && editing) {
    return (
      <div onClick={e => e.stopPropagation()} className="flex items-center gap-1 w-full">
        <input
          type="number"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { onUpdate(parseFloat(val) || 0); setEditing(false); }}
          onKeyDown={e => { if (e.key === "Enter") { onUpdate(parseFloat(val) || 0); setEditing(false); } }}
          className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 font-mono text-sm text-blue-700 outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-1 w-full">
      <p className="text-sm font-mono font-semibold text-blue-700 leading-none">{formatCurrency(project.budget)}</p>
      {editMode && (
        <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
          <Edit2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── ExecTrackingSection ──────────────────────────────────────────────────────

interface ExecTrackingSectionProps {
  projects: any[]; // keep any[] here for now — these are ProjectSummary but Dashboard's state is still untyped
  totalAwarded: number;
  totalBilled: number;
}
function ExecTrackingSection({ projects, totalAwarded, totalBilled }: ExecTrackingSectionProps) {
  const allAwardedPkgs = projects.flatMap((p: any) =>
    p.packages.filter((pk: any) => pk.currentStage === "Award")
  );
  if (allAwardedPkgs.length === 0) return null;

  const portfolioFinancialPct = totalAwarded > 0 ? Math.min(100, (totalBilled / totalAwarded) * 100) : 0;

  // perMilestoneAvg treats packages with no DB rows for a milestone as 0%,
  // giving the correct denominator (allAwardedPkgs.length × 6).
  const perMilestoneAvg = EXECUTION_MILESTONES.map(name => {
    const sum = allAwardedPkgs.reduce((s: number, pkg: any) => {
      const m = (pkg.milestones || []).find((x: any) => x.milestoneName === name);
      return s + (m ? Number(m.progress) : 0);
    }, 0);
    return { name, avg: allAwardedPkgs.length > 0 ? sum / allAwardedPkgs.length : 0 };
  });

  // Overall = average of the 6 per-milestone averages.
  // Using per-milestone avgs (not raw DB row counts) ensures packages with
  // missing rows are counted as 0%, not excluded from the denominator.
  const portfolioMilestonePct = perMilestoneAvg.length > 0
    ? perMilestoneAvg.reduce((s, m) => s + m.avg, 0) / perMilestoneAvg.length
    : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-emerald-600" />
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Execution Tracking</p>
          </div>
          <h3 className="text-base font-semibold text-slate-900">Portfolio Milestone Progress</h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-slate-500">In Execution</p>
            <p className="text-xl font-mono font-semibold text-emerald-600">{allAwardedPkgs.length}</p>
            <p className="text-[10px] text-slate-400">packages</p>
          </div>
          <div className="w-px h-10 bg-slate-200" />
          <div className="text-right">
            <p className="text-xs text-slate-500">Milestone Avg</p>
            <p className="text-xl font-mono font-semibold text-blue-600">{portfolioMilestonePct.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-400">all milestones</p>
          </div>
          <div className="w-px h-10 bg-slate-200" />
          <div className="text-right">
            <p className="text-xs text-slate-500">Financial</p>
            <p className="text-xl font-mono font-semibold text-violet-600">{portfolioFinancialPct.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-400">billed / awarded</p>
          </div>
        </div>
      </div>

      {/* Overall bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-blue-700 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />Overall Milestone Progress
            </span>
            <span className="text-sm font-mono font-bold text-blue-700">{portfolioMilestonePct.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-blue-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${portfolioMilestonePct >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
              style={{ width: `${Math.min(100, portfolioMilestonePct)}%` }} />
          </div>
          <p className="text-[10px] text-blue-400 mt-1">{allAwardedPkgs.length} packages · {EXECUTION_MILESTONES.length} milestones each</p>
        </div>
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-violet-700 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />Overall Financial Progress
            </span>
            <span className="text-sm font-mono font-bold text-violet-700">{portfolioFinancialPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-violet-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${portfolioFinancialPct >= 100 ? "bg-emerald-500" : "bg-violet-500"}`}
              style={{ width: `${Math.min(100, portfolioFinancialPct)}%` }} />
          </div>
          <p className="text-[10px] text-violet-400 mt-1">{formatCurrency(totalBilled)} billed of {formatCurrency(totalAwarded)} awarded</p>
        </div>
      </div>

      {/* Full-width milestone pipeline */}
      <div>
        <p className="text-xs font-semibold text-slate-700 mb-4">
          Milestone Pipeline
          <span className="font-normal text-slate-400 ml-1">(portfolio avg across {allAwardedPkgs.length} package{allAwardedPkgs.length !== 1 ? "s" : ""})</span>
        </p>
        <div className="space-y-3">
          {perMilestoneAvg.map((m, i) => (
            <div key={m.name} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-5 flex items-center justify-center">
                {m.avg >= 100
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <span className="text-[10px] font-bold text-slate-400">{i + 1}</span>
                }
              </div>
              <span className={`text-xs font-medium flex-shrink-0 w-52 truncate ${m.avg >= 100 ? "text-slate-400 line-through" : "text-slate-700"}`}>
                {m.name}
              </span>
              <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${m.avg >= 100 ? "bg-emerald-500" : m.avg > 0 ? "bg-blue-500" : "bg-slate-200"}`}
                  style={{ width: `${m.avg}%` }}
                />
              </div>
              <span className={`text-xs font-mono font-semibold w-10 text-right flex-shrink-0 ${
                m.avg >= 100 ? "text-emerald-600" : m.avg > 0 ? "text-blue-600" : "text-slate-400"
              }`}>{m.avg.toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-5 mt-4 pt-3 border-t border-slate-100">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-3 h-2 rounded-sm bg-blue-500 inline-block" />In progress</span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-3 h-2 rounded-sm bg-emerald-500 inline-block" />Complete</span>
          <span className="text-[10px] text-slate-400 ml-auto">Open a project to drill down per package</span>
        </div>
      </div>
    </div>
  );
}

// ─── ProcurementPipelineSection ───────────────────────────────────────────────

function ProcurementPipelineSection({ projects }: { projects: any[] }) {
  const stageConfig = [
    { key: "Spec Received", label: "Spec Received", color: "bg-slate-400" },
    { key: "RFQ Float", label: "RFQ Float", color: "bg-blue-400" },
    { key: "Technical Negotiation", label: "Tech Neg.", color: "bg-blue-500" },
    { key: "Commercial Negotiation", label: "Comm. Neg.", color: "bg-blue-600" },
    { key: "Award", label: "Awarded", color: "bg-emerald-500" },
  ];

  const allPkgs = projects.flatMap((p: any) => p.packages);
  const total = allPkgs.length;

  const stageCounts = stageConfig.map(s => ({
    ...s,
    count: allPkgs.filter((pk: any) => pk.currentStage === s.key).length,
    pct: total > 0 ? (allPkgs.filter((pk: any) => pk.currentStage === s.key).length / total) * 100 : 0,
  }));

  const cumulativeCompleted = total > 0 ? (stageCounts[4].count / total) * 100 : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Procurement Pipeline</p>
          <h3 className="text-base font-semibold text-slate-900">Package Stage Distribution</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Packages</p>
            <p className="text-xl font-mono font-semibold text-slate-900">{total}</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-right">
            <p className="text-xs text-slate-500">Awarded</p>
            <p className="text-xl font-mono font-semibold text-emerald-600">{cumulativeCompleted.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex h-6 w-full rounded-full overflow-hidden bg-slate-100">
          {stageCounts.map((s) => (
            s.pct > 0 && (
              <div
                key={s.key}
                className={`${s.color} relative flex items-center justify-center transition-all duration-500`}
                style={{ width: `${s.pct}%`, minWidth: s.pct > 0 ? '2px' : '0' }}
                title={`${s.label}: ${s.count} packages (${s.pct.toFixed(1)}%)`}
              >
                {s.pct > 8 && (
                  <span className="text-[10px] font-medium text-white">{s.pct.toFixed(0)}%</span>
                )}
              </div>
            )
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {stageCounts.map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${s.color} flex-shrink-0`} />
            <span className="text-xs text-slate-700">{s.label}</span>
            <span className="text-xs font-mono text-slate-500">{s.count}</span>
            <span className="text-xs text-slate-400">({s.pct.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: any; // ProjectSummary
  editMode: boolean;
  isAdmin: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdateBudget: (id: string, budget: number) => void;
}
function ProjectCard({ project: p, editMode, isAdmin, onOpen, onDelete, onUpdateStatus, onUpdateBudget }: ProjectCardProps) {
  const awarded = p.packages.reduce((s: any, pk: any) => s + (pk.awardValue || 0), 0);
  const billed = p.packages.reduce((s: any, pk: any) => s + (pk.billedAmount || 0), 0);
  const awardedPct = p.budget > 0 ? Math.min(100, (awarded / p.budget) * 100) : 0;
  const financialPct = awarded > 0 ? Math.min(100, (billed / awarded) * 100) : 0;
  const awardedCount = p.packages.filter((pk: any) => pk.currentStage === "Award").length;
  const milestonesProgressSum = p.packages.filter((pk: any) => pk.currentStage === "Award").reduce((s: any, pk: any) => s + (pk.milestonesProgressSum || 0), 0);
  const milestonesCount = p.packages.filter((pk: any) => pk.currentStage === "Award").reduce((s: any, pk: any) => s + (pk.totalMilestones || 0), 0);
  const taskPct = milestonesCount > 0 ? milestonesProgressSum / milestonesCount : 0;

  return (
    <div
      key={p.id}
      className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col"
      onClick={() => onOpen(p.id)}
    >
      {/* Card header */}
      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {editMode ? (
                <select
                  value={p.status}
                  onClick={e => e.stopPropagation()}
                  onChange={async (e) => { e.stopPropagation(); await onUpdateStatus(p.id, e.target.value); }}
                  className="bg-white border border-slate-200 rounded text-xs text-slate-700 px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              ) : (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset ${statusColors[p.status]}`}>
                  {p.status}
                </span>
              )}
              <span className="text-xs text-slate-400">Modified {new Date(p.updatedAt).toLocaleDateString()}</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{p.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{p.client}</p>
          </div>
          <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
            {editMode && isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="p-2 rounded-lg border border-slate-200 text-slate-400 group-hover:border-blue-300 group-hover:text-blue-600 transition">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Budget</p>
            <ProjectBudgetCell project={p} onUpdate={(val) => onUpdateBudget(p.id, val)} editMode={editMode} />
          </div>
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Packages</p>
            <p className="text-sm font-mono font-semibold text-slate-700 leading-none">{p.packages.length}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Billed</p>
            <p className="text-sm font-mono font-semibold text-violet-600 leading-none">{formatCurrency(billed)}</p>
          </div>
        </div>

        {/* Dual progress bars */}
        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs text-slate-400">Financial Progress</p>
              <p className="text-xs font-mono text-slate-500">{financialPct.toFixed(0)}%</p>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${financialPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs text-slate-400">Milestone Progress</p>
              <p className="text-xs font-mono text-slate-500">{taskPct.toFixed(0)}% · {awardedCount} awarded</p>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${taskPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Card footer CTA */}
      <div className="px-6 pb-5">
        <div className="w-full py-2.5 bg-slate-50 border border-slate-200 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white text-slate-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200">
          Open Project <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard({ onShowBudgetAnalytics, onShowAdmin, onShowPlatform }: any) {
  const { user, logout, editMode, setEditMode, isOrgBlocked } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [company, setCompany] = useState<CompanyInfo>({ name: "", tagline: "" });
  const [newProj, setNewProj] = useState({ name: "", client: "", budget: "" });
  const [search, setSearch] = useState("");

  const hiddenAt = useRef<number>(0);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [p, c, ci] = await Promise.all([fetchProjects(), fetchCategories(), getCompanyInfo()]);
      setProjects(p);
      setCategories(c);
      setCompany(ci);
    } catch (e) {
      console.error("Load failed", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
      } else if (document.visibilityState === "visible") {
        // Only silently refresh if away for more than 5 minutes
        if (Date.now() - hiddenAt.current > 5 * 60 * 1000) loadData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const handleAddProject = async () => {
    if (!newProj.name || !newProj.client || !newProj.budget) return;
    await addProject(newProj.name, newProj.client, parseFloat(newProj.budget));
    setShowAddProject(false); setNewProj({ name: "", client: "", budget: "" });
    loadData();
  };

  const handleDeleteProject = async (id: string) => {
    if (!editMode) return;
    if (confirm("Delete project and all its packages?")) {
      await deleteProject(id);
      loadData();
    }
  };

  const handleUpdateProjectStatus = async (id: string, status: string) => {
    await updateProject(id, { status: status as "Active" | "On Hold" | "Completed" });
    loadData();
  };

  const handleUpdateProjectBudget = async (id: string, budget: number) => {
    await updateProject(id, { budget });
    loadData();
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.client.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: projects.length,
    packages: projects.reduce((s, p) => s + p.packages.length, 0),
    budget: projects.reduce((s, p) => s + p.budget, 0),
    awarded: projects.reduce((s, p) => s + p.packages.reduce((ss: any, pk: any) => ss + (pk.awardValue || 0), 0), 0),
    billed: projects.reduce((s, p) => s + p.packages.reduce((ss: any, pk: any) => ss + (pk.billedAmount || 0), 0), 0),
    milestonesProgressSum: projects.reduce((s, p) => s + p.packages.filter((pk: any) => pk.currentStage === 'Award').reduce((ss: any, pk: any) => ss + (pk.milestonesProgressSum || 0), 0), 0),
    // Denominator is always awardedPkgs × 6 — DB row count undercounts when
    // packages have never been visited (missing rows default to 0%).
    milestonesCount: projects.reduce((s, p) => s + p.packages.filter((pk: any) => pk.currentStage === 'Award').length, 0) * EXECUTION_MILESTONES.length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <div className="text-xs text-slate-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 hover:opacity-80 transition group"
            title="Go to home"
          >
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-700 transition flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-sm font-semibold text-slate-900 leading-none">{company.name}</h1>
              <p className="text-[11px] text-slate-500 mt-1">{company.tagline}</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                placeholder="Search projects..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition w-60"
              />
            </div>

            <button
              onClick={onShowBudgetAnalytics}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm shadow-amber-200"
            >
              <BarChart3 className="w-4 h-4" /> Director Dashboard
            </button>

            {user?.canEdit && !isOrgBlocked && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition ${
                  editMode
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {editMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {editMode ? "Edit Mode ON" : "Enter Edit Mode"}
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={onShowAdmin}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
              >
                <Settings className="w-4 h-4" /> Admin
              </button>
            )}

            {user?.isPlatformAdmin && (
              <button
                onClick={onShowPlatform}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition"
              >
                <Crown className="w-4 h-4" /> Platform
              </button>
            )}

            <button
              onClick={() => setShowHelp(true)}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition"
              title="Help & User Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* PORTFOLIO SUMMARY */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Portfolio Summary</p>
              <h2 className="text-xl font-semibold text-slate-900">Financial Allocation</h2>
              <p className="text-sm text-slate-500 max-w-xl">
                Real-time mapping of capital allocation across all current projects.
              </p>
              <div className="flex flex-wrap gap-6 pt-2">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Available Capital</p>
                  <p className="text-lg font-mono font-semibold text-blue-700">
                    {formatCurrency(Math.max(0, stats.budget - stats.awarded))}
                  </p>
                </div>
                <div className="border-l border-slate-200 pl-6">
                  <p className="text-xs text-slate-500 mb-1">Awarded Rate</p>
                  <p className="text-lg font-mono font-semibold text-slate-900">
                    {stats.budget > 0 ? ((stats.awarded / stats.budget) * 100).toFixed(1) : "0.0"}%
                  </p>
                </div>
                <div className="border-l border-slate-200 pl-6">
                  <p className="text-xs text-slate-500 mb-1">Billed to Date</p>
                  <p className="text-lg font-mono font-semibold text-violet-700">
                    {formatCurrency(stats.billed)}
                  </p>
                </div>
                <div className="border-l border-slate-200 pl-6">
                  <p className="text-xs text-slate-500 mb-1">Billing Rate</p>
                  <p className="text-lg font-mono font-semibold text-slate-900">
                    {stats.awarded > 0 ? ((stats.billed / stats.awarded) * 100).toFixed(1) : "0.0"}%
                  </p>
                </div>
                <div className="border-l border-slate-200 pl-6">
                  <p className="text-xs text-slate-500 mb-1">Milestone Progress</p>
                  <p className="text-lg font-mono font-semibold text-blue-700">
                    {stats.milestonesCount > 0 ? (stats.milestonesProgressSum / stats.milestonesCount).toFixed(1) : "0.0"}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
              {/* Dual-ring donut: outer = awarded, inner = billed */}
              <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Outer track (awarded) */}
                  <circle cx="50" cy="50" r="40" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="50" cy="50" r="40"
                    stroke="#2563eb"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - (stats.budget > 0 ? Math.min(1, stats.awarded / stats.budget) : 0))}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Inner track (billed) */}
                  <circle cx="50" cy="50" r="28" stroke="#e2e8f0" strokeWidth="7" fill="transparent" />
                  <circle
                    cx="50" cy="50" r="28"
                    stroke="#7c3aed"
                    strokeWidth="7"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 28}
                    strokeDashoffset={2 * Math.PI * 28 * (1 - (stats.awarded > 0 ? Math.min(1, stats.billed / stats.awarded) : 0))}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="text-[10px] text-slate-500 leading-none">Billed</p>
                  <p className="text-xs font-mono font-semibold text-violet-700">{stats.awarded > 0 ? ((stats.billed / stats.awarded) * 100).toFixed(0) : 0}%</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                  <div>
                    <p className="text-[10px] text-slate-500 leading-none">Awarded</p>
                    <p className="text-xs font-mono font-semibold text-slate-900 mt-0.5">{formatCurrency(stats.awarded)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-violet-600 rounded-full" />
                  <div>
                    <p className="text-[10px] text-slate-500 leading-none">Billed</p>
                    <p className="text-xs font-mono font-semibold text-violet-700 mt-0.5">{formatCurrency(stats.billed)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
                  <div>
                    <p className="text-[10px] text-slate-500 leading-none">Remaining</p>
                    <p className="text-xs font-mono font-semibold text-slate-700 mt-0.5">{formatCurrency(Math.max(0, stats.budget - stats.awarded))}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* EXECUTION TRACKING — portfolio-level milestone progress */}
        <ExecTrackingSection projects={projects} totalAwarded={stats.awarded} totalBilled={stats.billed} />

        {/* STAT CARDS — portfolio rollups; drill into Project Portfolio below for detail */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {([
            { label: "Active Projects",  icon: FolderOpen, accent: "text-blue-600",   val: stats.total },
            { label: "Total Packages",   icon: Box,        accent: "text-slate-900",  val: stats.packages },
            { label: "Total Budget",     icon: Activity,   accent: "text-slate-900",  val: formatCurrency(stats.budget) },
            { label: "Awarded Pipeline", icon: Shield,     accent: "text-blue-700",   val: formatCurrency(stats.awarded) },
            { label: "Total Billed",     icon: Receipt,    accent: "text-violet-700", val: formatCurrency(stats.billed) },
          ] as any[]).map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 w-fit mb-3">
                <s.icon className={`w-4 h-4 ${s.accent}`} />
              </div>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-xl font-semibold leading-none ${s.accent}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* PIPELINE */}
        <ProcurementPipelineSection projects={projects} />

        {/* SECTION TITLE */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-3">
            Project Portfolio
            <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-0.5 rounded-full">{filteredProjects.length} total</span>
          </h2>
          {editMode && user?.role === 'admin' && (
            <button onClick={() => setShowAddProject(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition">
              <Plus className="w-4 h-4" /> New Project
            </button>
          )}
        </div>

        {/* PORTFOLIO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm font-medium">No projects found</p>
            </div>
          ) : (
            filteredProjects.map((p: any) => (
              <ProjectCard
                key={p.id}
                project={p}
                editMode={editMode}
                isAdmin={user?.role === 'admin'}
                onOpen={(id) => router.push(`/projects/${id}`)}
                onDelete={handleDeleteProject}
                onUpdateStatus={handleUpdateProjectStatus}
                onUpdateBudget={handleUpdateProjectBudget}
              />
            ))
          )}
        </div>
      </main>

      {/* NEW PROJECT MODAL */}
      {showAddProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowAddProject(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">New Repository</h2>
              <button onClick={() => setShowAddProject(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Project Name</label>
                <input
                  value={newProj.name}
                  onChange={e => setNewProj({ ...newProj, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder-slate-400"
                  placeholder="e.g. SKYLINE RESIDENCY"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Client</label>
                <input
                  value={newProj.client}
                  onChange={e => setNewProj({ ...newProj, client: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder-slate-400"
                  placeholder="e.g. DLF INFRASTRUCTURE"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Budget (INR)</label>
                <input
                  type="number"
                  value={newProj.budget}
                  onChange={e => setNewProj({ ...newProj, budget: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none font-mono text-sm text-slate-900 placeholder-slate-400"
                  placeholder="50,00,000"
                />
              </div>
            </div>

            <button
              onClick={handleAddProject}
              className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition"
            >
              Initialize Project
            </button>
          </div>
        </div>
      )}

      {/* ── HELP GUIDE ─────────────────────────────────────────────────────── */}
      {showHelp && <HelpGuide onClose={() => setShowHelp(false)} />}
    </div>
  );
}
