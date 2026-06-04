"use client";

import { useEffect, useState } from "react";
import { fetchProjectMilestone, type ProjectMilestoneView } from "@/lib/store";
import { ArrowLeft, Flag, CheckCircle2, Clock, Circle, CalendarDays, User } from "lucide-react";

const statusColors: Record<string, string> = {
  Active: "text-blue-700",
  "On Hold": "text-amber-700",
  Completed: "text-slate-500",
};

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

function progressStyles(progress: number) {
  if (progress === 100) return { bar: "bg-emerald-500", label: "text-emerald-700", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (progress > 0)     return { bar: "bg-amber-400",   label: "text-amber-700",   chip: "bg-amber-50 text-amber-700 border-amber-200" };
  return { bar: "bg-slate-200", label: "text-slate-400", chip: "bg-slate-50 text-slate-500 border-slate-200" };
}

export default function MilestonePackagesView({
  projectId,
  milestone,
  onBack,
  onOpenPackage,
}: {
  projectId: string;
  milestone: string;
  onBack: () => void;
  onOpenPackage: (packageId: string) => void;
}) {
  const [data, setData] = useState<ProjectMilestoneView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProjectMilestone(projectId, milestone)
      .then(d => { if (active) setData(d); })
      .catch(e => { if (active) setError(e?.message || "Failed to load milestone"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, milestone]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <div className="text-xs text-slate-500">Loading milestone…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-600">{error || "Milestone not found"}</p>
        <button onClick={onBack} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
          Go back
        </button>
      </div>
    );
  }

  const totalPkgs   = data.packages.length;
  const completed   = data.packages.filter(p => p.progress === 100).length;
  const inProgress  = data.packages.filter(p => p.progress > 0 && p.progress < 100).length;
  const notStarted  = totalPkgs - completed - inProgress;
  const avgProgress = totalPkgs > 0 ? Math.round(data.packages.reduce((s, p) => s + p.progress, 0) / totalPkgs) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[68px] relative flex items-center">

          {/* Left — back button */}
          <button
            onClick={onBack}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex-shrink-0 z-10"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Center — project name large + milestone subtitle, absolutely centred */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-20">
            <h1 className="text-base font-bold text-slate-900 leading-tight truncate max-w-full text-center">
              {data.projectName}
            </h1>
            <p className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
              <Flag className="w-3 h-3 text-blue-500 flex-shrink-0" />
              <span className="font-medium text-slate-700">{data.milestone}</span>
              <span className="text-slate-300">·</span>
              <span className={statusColors[data.status] || "text-slate-500"}>{data.status}</span>
            </p>
          </div>

          {/* Right — avg progress chip */}
          <div className="ml-auto flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex-shrink-0 z-10">
            <span className="text-xs font-mono font-semibold text-slate-700">{avgProgress}%</span>
            <span className="text-xs text-slate-500">avg</span>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary chips */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Packages", value: totalPkgs, icon: Circle, accent: "text-slate-700" },
            { label: "Completed", value: completed, icon: CheckCircle2, accent: "text-emerald-700" },
            { label: "In Progress", value: inProgress, icon: Clock, accent: "text-amber-700" },
            { label: "Not Started", value: notStarted, icon: Circle, accent: "text-slate-400" },
          ].map(c => (
            <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <c.icon className={`w-4 h-4 ${c.accent}`} />
                <span className="text-xs font-medium text-slate-500">{c.label}</span>
              </div>
              <p className={`text-2xl font-semibold ${c.accent}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Per-package cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.packages.map(pkg => {
            const ps = progressStyles(pkg.progress);
            return (
              <div
                key={pkg.id}
                onClick={() => onOpenPackage(pkg.id)}
                className="pressable bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-sm transition cursor-pointer flex flex-col"
              >
                {/* Package header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{pkg.name}</h3>
                    {pkg.category ? <p className="text-xs text-slate-400 truncate mt-0.5">{pkg.category}</p> : null}
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded border flex-shrink-0 ${ps.chip}`}>
                    {pkg.currentStage}
                  </span>
                </div>

                {/* Milestone progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Milestone progress</span>
                    <span className={`text-xs font-mono font-semibold ${ps.label}`}>{pkg.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${ps.bar}`} style={{ width: `${pkg.progress}%` }} />
                  </div>
                </div>

                {/* Tasks */}
                {pkg.tasks.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-4 text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No tasks yet
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pkg.tasks.map(t => {
                      const ts = progressStyles(t.progress);
                      const start = fmtDate(t.startDate);
                      const end = fmtDate(t.endDate);
                      return (
                        <div key={t.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-medium text-slate-700 truncate">{t.name}</span>
                            <span className={`text-[11px] font-mono font-semibold flex-shrink-0 ${ts.label}`}>{t.progress}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                            <div className={`h-full rounded-full ${ts.bar}`} style={{ width: `${t.progress}%` }} />
                          </div>
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                            {(start || end) && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {start || "—"}{end ? ` → ${end}` : ""}
                              </span>
                            )}
                            {t.createdBy && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {t.createdBy}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {data.packages.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-500">
            This project has no packages yet.
          </div>
        )}
      </main>
    </div>
  );
}
