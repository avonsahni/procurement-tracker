"use client";

import { CheckCircle2, Circle, ClipboardList } from "lucide-react";
import { EXECUTION_MILESTONES, PackageMilestone } from "@/lib/types";

interface MilestoneTrackerProps {
  milestones: PackageMilestone[];
  readonly?: boolean;
  onToggle: (milestoneName: string, completed: boolean) => Promise<void>;
}

export default function MilestoneTracker({ milestones, readonly, onToggle }: MilestoneTrackerProps) {
  const total = EXECUTION_MILESTONES.length;
  const completedCount = milestones.filter(m => m.completed).length;
  const pct = total > 0 ? (completedCount / total) * 100 : 0;

  const getMilestone = (name: string) => milestones.find(m => m.milestoneName === name);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Execution Milestones</h3>
          <span className="text-xs text-slate-400 ml-1">({completedCount}/{total})</span>
        </div>
        <span className={`text-xs font-mono font-semibold ${pct === 100 ? "text-emerald-600" : "text-slate-700"}`}>
          {pct.toFixed(0)}%
        </span>
      </div>

      <div className="px-5 pt-4 pb-3">
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-500" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {EXECUTION_MILESTONES.map((name, i) => {
          const m = getMilestone(name);
          const done = m?.completed ?? false;
          const isClickable = !readonly && !!m;

          return (
            <div key={name} className={`px-5 py-3 flex items-center gap-3 ${isClickable ? "hover:bg-slate-50/60" : ""} transition`}>
              <button
                disabled={!isClickable}
                onClick={() => m && onToggle(name, !done)}
                className="flex-shrink-0 transition disabled:cursor-default"
                aria-label={done ? `Mark ${name} incomplete` : `Mark ${name} complete`}
              >
                {done
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  : <Circle className={`w-5 h-5 ${isClickable ? "text-slate-300 hover:text-blue-400" : "text-slate-200"}`} />
                }
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? "line-through text-slate-400" : "text-slate-900"}`}>
                  {i + 1}. {name}
                </p>
                {done && m?.completedBy && (
                  <p className="text-[10px] text-slate-400 mt-0.5">by {m.completedBy}</p>
                )}
              </div>
              {done && (
                <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                  Done
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
