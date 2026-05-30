"use client";

import { useState, useEffect } from "react";
import { fetchProjects } from "@/lib/store";
import { formatCurrency, EXECUTION_MILESTONES } from "@/lib/types";
import { ArrowLeft, BarChart3, TrendingUp, DollarSign, Layers, AlertTriangle, CheckCircle2, Clock, Receipt, Flag } from "lucide-react";

interface MilestoneStat {
  name: string;
  avgProgress: number;
  done: number;
  inProgress: number;
  total: number;
}

interface ProjectBudgetData {
  id: string;
  name: string;
  client: string;
  status: string;
  budget: number;
  committed: number;
  billed: number;
  totalPackages: number;
  awardedPackages: number;
  milestoneStats: MilestoneStat[];
}

const statusColors: Record<string, string> = {
  Active: "text-blue-700",
  "On Hold": "text-amber-700",
  Completed: "text-slate-500",
};

export default function BudgetAnalytics({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<ProjectBudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"name" | "budget" | "committed" | "billed" | "utilization">("budget");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchProjects().then(projects => {
      const parsed: ProjectBudgetData[] = projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        client: p.client,
        status: p.status,
        budget: p.budget,
        committed: p.packages.reduce((s: number, pk: any) => s + (pk.awardValue || 0), 0),
        billed: p.packages.reduce((s: number, pk: any) => s + (pk.billedAmount || 0), 0),
        totalPackages: p.packages.length,
        awardedPackages: p.packages.filter((pk: any) => pk.currentStage === "Award").length,
        milestoneStats: EXECUTION_MILESTONES.map(mName => {
          const progresses: number[] = p.packages.map((pk: any) => {
            const m = pk.milestones?.find((m: any) => m.milestoneName === mName);
            return m ? (m.progress ?? 0) : 0;
          });
          const total      = progresses.length;
          const done       = progresses.filter(v => v === 100).length;
          const inProgress = progresses.filter(v => v > 0 && v < 100).length;
          const avgProgress = total > 0 ? progresses.reduce((s, v) => s + v, 0) / total : 0;
          return { name: mName, avgProgress, done, inProgress, total };
        }),
      }));
      setData(parsed);
    }).finally(() => setLoading(false));
  }, []);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const sorted = [...data].sort((a, b) => {
    const av = sortBy === "name" ? a.name
      : sortBy === "budget" ? a.budget
      : sortBy === "committed" ? a.committed
      : sortBy === "billed" ? a.billed
      : (a.budget > 0 ? a.committed / a.budget : 0);
    const bv = sortBy === "name" ? b.name
      : sortBy === "budget" ? b.budget
      : sortBy === "committed" ? b.committed
      : sortBy === "billed" ? b.billed
      : (b.budget > 0 ? b.committed / b.budget : 0);
    if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
    return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const totalBudget    = data.reduce((s, p) => s + p.budget, 0);
  const totalCommitted = data.reduce((s, p) => s + p.committed, 0);
  const totalBilled    = data.reduce((s, p) => s + p.billed, 0);
  const totalRemaining = totalBudget - totalCommitted;
  const overallUtilization = totalBudget > 0 ? (totalCommitted / totalBudget) * 100 : 0;
  const billingUtilization = totalCommitted > 0 ? (totalBilled / totalCommitted) * 100 : 0;
  const overBudgetCount = data.filter(p => p.committed > p.budget).length;
  const maxBudget = Math.max(...data.map(p => p.budget), 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <div className="text-xs text-slate-500">Loading analytics…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-slate-900 leading-none">Director Dashboard</h1>
                <p className="text-xs text-slate-500 mt-1">Budget · Milestones · Portfolio Overview</p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-600">Live</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Portfolio Budget",
              value: formatCurrency(totalBudget),
              icon: DollarSign,
              accent: "text-blue-700",
              sub: `${data.length} projects`,
            },
            {
              label: "Total Committed",
              value: formatCurrency(totalCommitted),
              icon: TrendingUp,
              accent: "text-emerald-700",
              sub: `${overallUtilization.toFixed(1)}% of budget`,
            },
            {
              label: "Total Billed",
              value: formatCurrency(totalBilled),
              icon: Receipt,
              accent: "text-blue-600",
              sub: totalCommitted > 0
                ? `${billingUtilization.toFixed(1)}% of committed`
                : "No committed value",
            },
            {
              label: totalRemaining < 0 ? "Over-Budget Projects" : "Remaining Capital",
              value: overBudgetCount > 0 ? overBudgetCount.toString() : formatCurrency(Math.max(0, totalRemaining)),
              icon: overBudgetCount > 0 ? AlertTriangle : Layers,
              accent: overBudgetCount > 0 ? "text-red-600" : totalRemaining < 0 ? "text-red-600" : "text-slate-900",
              sub: overBudgetCount > 0 ? "Exceeding budget" : "Unallocated",
            },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg w-fit mb-3">
                <s.icon className={`w-4 h-4 ${s.accent}`} />
              </div>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-xl font-mono font-semibold leading-none ${s.accent}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-1.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* PORTFOLIO UTILIZATION */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="flex-1 w-full">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Portfolio Overview</p>
              <h2 className="text-xl font-semibold text-slate-900 mb-5">Overall Budget Utilization</h2>

              {/* Budget bar */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-slate-400 text-right flex-shrink-0">Budget</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-lg overflow-hidden">
                    <div className="h-full w-full bg-slate-300 rounded-lg" />
                  </div>
                  <span className="w-32 text-xs font-mono font-medium text-slate-700 text-right flex-shrink-0">
                    {formatCurrency(totalBudget)}
                  </span>
                </div>

                {/* Committed bar */}
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-slate-400 text-right flex-shrink-0">Committed</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className={`h-full rounded-lg transition-all duration-700 ease-out ${
                        overallUtilization > 100 ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(overallUtilization, 100)}%` }}
                    />
                  </div>
                  <span className={`w-32 text-xs font-mono font-medium text-right flex-shrink-0 ${
                    overallUtilization > 100 ? "text-red-600" : "text-emerald-700"
                  }`}>
                    {formatCurrency(totalCommitted)}
                  </span>
                </div>

                {/* Billed bar */}
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-slate-400 text-right flex-shrink-0">Billed</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-lg transition-all duration-700 ease-out"
                      style={{ width: `${totalBudget > 0 ? Math.min((totalBilled / totalBudget) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <span className="w-32 text-xs font-mono font-medium text-blue-700 text-right flex-shrink-0">
                    {formatCurrency(totalBilled)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="text-xs text-slate-600">Budget {formatCurrency(totalBudget)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-600">Committed {formatCurrency(totalCommitted)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="text-xs text-slate-600">Billed {formatCurrency(totalBilled)}</span>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="48" stroke="#e2e8f0" strokeWidth="10" fill="transparent" />
                  {/* committed ring */}
                  <circle
                    cx="60" cy="60" r="48"
                    stroke="#10b981"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * (1 - Math.min(1, overallUtilization / 100))}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* billed ring (inner) */}
                  <circle
                    cx="60" cy="60" r="36"
                    stroke="#2563eb"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 36}
                    strokeDashoffset={2 * Math.PI * 36 * (1 - Math.min(1, totalBudget > 0 ? totalBilled / totalBudget : 0))}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] text-slate-500">Committed</p>
                  <p className="text-lg font-mono font-semibold text-slate-900">{overallUtilization.toFixed(0)}%</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs text-slate-500">Budget</p>
                  <p className="text-sm font-mono font-semibold text-slate-700">{formatCurrency(totalBudget)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Committed</p>
                  <p className="text-sm font-mono font-semibold text-emerald-700">{formatCurrency(totalCommitted)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Billed</p>
                  <p className="text-sm font-mono font-semibold text-blue-700">{formatCurrency(totalBilled)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Balance</p>
                  <p className={`text-sm font-mono font-semibold ${totalRemaining < 0 ? "text-red-600" : "text-slate-700"}`}>
                    {formatCurrency(Math.max(0, totalRemaining))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PER-PROJECT BAR CHART */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Project Breakdown</p>
              <h2 className="text-xl font-semibold text-slate-900">Budget vs Committed vs Billed · Per Project</h2>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-300" />
                <span className="text-slate-500">Budget</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-500">Committed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-600" />
                <span className="text-slate-500">Billed</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {sorted.map((p) => {
              const budgetPct      = (p.budget / maxBudget) * 100;
              const committedPct   = p.budget > 0 ? Math.min((p.committed / p.budget) * 100, 100) : 0;
              const billedPct      = p.budget > 0 ? Math.min((p.billed / p.budget) * 100, 100) : 0;
              const utilizationPct = p.budget > 0 ? (p.committed / p.budget) * 100 : 0;
              const billingPct     = p.committed > 0 ? (p.billed / p.committed) * 100 : 0;
              const isOver         = p.committed > p.budget;

              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[p.status]} bg-slate-50 border border-slate-200`}>
                        {p.status}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 truncate">{p.name}</span>
                      <span className="text-xs text-slate-400 hidden md:inline truncate">{p.client}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      {isOver ? (
                        <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Over Budget
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">{utilizationPct.toFixed(1)}% used</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {/* Budget row */}
                    <div className="flex items-center gap-3">
                      <div className="w-20 flex-shrink-0 text-right">
                        <span className="text-xs text-slate-400">Budget</span>
                      </div>
                      <div className="flex-1 h-4 bg-slate-100 rounded-lg overflow-hidden">
                        <div className="h-full bg-slate-300 rounded-lg" style={{ width: `${budgetPct}%` }} />
                      </div>
                      <div className="w-32 flex-shrink-0 text-right">
                        <span className="text-xs font-mono font-medium text-slate-700">{formatCurrency(p.budget)}</span>
                      </div>
                    </div>

                    {/* Committed row */}
                    <div className="flex items-center gap-3">
                      <div className="w-20 flex-shrink-0 text-right">
                        <span className="text-xs text-slate-400">Committed</span>
                      </div>
                      <div className="flex-1 h-4 bg-slate-100 rounded-lg overflow-hidden">
                        <div className="h-full relative" style={{ width: `${budgetPct}%` }}>
                          <div
                            className={`h-full rounded-lg transition-all duration-500 ${
                              isOver ? "bg-red-500" : utilizationPct > 80 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${committedPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-32 flex-shrink-0 text-right">
                        <span className={`text-xs font-mono font-medium ${
                          isOver ? "text-red-600" : utilizationPct > 80 ? "text-amber-700" : "text-emerald-700"
                        }`}>
                          {formatCurrency(p.committed)}
                        </span>
                      </div>
                    </div>

                    {/* Billed row */}
                    <div className="flex items-center gap-3">
                      <div className="w-20 flex-shrink-0 text-right">
                        <span className="text-xs text-slate-400">Billed</span>
                      </div>
                      <div className="flex-1 h-4 bg-slate-100 rounded-lg overflow-hidden">
                        <div className="h-full relative" style={{ width: `${budgetPct}%` }}>
                          <div
                            className="h-full bg-blue-600 rounded-lg transition-all duration-500"
                            style={{ width: `${billedPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-32 flex-shrink-0 text-right">
                        <span className="text-xs font-mono font-medium text-blue-700">
                          {formatCurrency(p.billed)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 ml-[92px]">
                    <span className="text-xs text-slate-400">
                      {p.awardedPackages}/{p.totalPackages} pkgs awarded
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatCurrency(Math.max(0, p.budget - p.committed))} remaining
                    </span>
                    {p.billed > 0 && (
                      <span className="text-xs text-blue-500">
                        {billingPct.toFixed(1)}% of committed billed
                      </span>
                    )}
                  </div>

                  <div className="mt-4 border-b border-slate-100 last:border-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* MILESTONE ACHIEVEMENT STATUS */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
              <Flag className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-0.5">Milestone Achievement</p>
              <h2 className="text-base font-semibold text-slate-900">Execution Milestone Status · Per Project</h2>
            </div>
          </div>

          {/* Legend */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500">Completed (100%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-xs text-slate-500">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="text-xs text-slate-500">Not Started</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {sorted.map(p => {
              const totalDone = p.milestoneStats.reduce((s, m) => s + m.done, 0);
              const totalPossible = p.milestoneStats.reduce((s, m) => s + m.total, 0);
              const overallPct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

              return (
                <div key={p.id} className="p-5">
                  {/* Project header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded bg-slate-50 border border-slate-200 flex-shrink-0 ${statusColors[p.status]}`}>
                        {p.status}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 truncate">{p.name}</span>
                      <span className="text-xs text-slate-400 hidden md:inline truncate">{p.client}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className="text-xs text-slate-400">{p.totalPackages} pkg{p.totalPackages !== 1 ? "s" : ""}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${overallPct === 100 ? "bg-emerald-500" : overallPct > 0 ? "bg-amber-400" : "bg-slate-200"}`}
                            style={{ width: `${overallPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-medium text-slate-600">{overallPct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Milestone grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {p.milestoneStats.map((m, idx) => {
                      const isComplete  = m.avgProgress === 100;
                      const isActive    = m.avgProgress > 0 && m.avgProgress < 100;
                      const barColor    = isComplete ? "bg-emerald-500" : isActive ? "bg-amber-400" : "bg-slate-200";
                      const dotColor    = isComplete ? "bg-emerald-500" : isActive ? "bg-amber-400" : "bg-slate-300";
                      const labelColor  = isComplete ? "text-emerald-700" : isActive ? "text-amber-700" : "text-slate-400";

                      return (
                        <div key={m.name} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                            <span className="text-[10px] font-medium text-slate-500 leading-tight truncate">{m.name}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${m.avgProgress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-mono font-semibold ${labelColor}`}>
                              {Math.round(m.avgProgress)}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {m.done}/{m.total} done
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
