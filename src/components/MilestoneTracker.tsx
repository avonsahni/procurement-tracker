"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ClipboardList, CheckCircle2, Loader2 } from "lucide-react";
import { EXECUTION_MILESTONES, PackageMilestone } from "@/lib/types";

interface Props {
  milestones: PackageMilestone[];
  readonly?: boolean;
  onUpdate: (milestoneName: string, progress: number) => Promise<void>;
}

function DraggableBar({
  value,
  onChange,
  onCommit,
  readonly,
  saving,
}: {
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  readonly?: boolean;
  saving?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const valueFromPointer = (clientX: number): number => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readonly) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(valueFromPointer(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || readonly) return;
    onChange(valueFromPointer(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    const v = valueFromPointer(e.clientX);
    onChange(v);
    onCommit(v);
  };

  const fillColor = value === 100 ? "bg-emerald-500" : value > 0 ? "bg-blue-500" : "bg-slate-200";
  const thumbBorder = value === 100 ? "border-emerald-500" : "border-blue-500";

  return (
    <div className="flex items-center gap-2 w-full">
      <div
        ref={trackRef}
        className={`relative h-5 flex-1 ${readonly ? "cursor-default" : "cursor-ew-resize"} select-none`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Track */}
        <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-3 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-colors ${fillColor}`}
            style={{ width: `${value}%` }}
          />
        </div>
        {/* Thumb */}
        {!readonly && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 ${thumbBorder} rounded-full shadow pointer-events-none z-10`}
            style={{ left: `calc(${value}% - 10px)` }}
          />
        )}
      </div>
      {/* Saving indicator — fixed width so layout doesn't jump */}
      <div className="w-4 flex-shrink-0 flex items-center justify-center">
        {saving && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
      </div>
    </div>
  );
}

export default function MilestoneTracker({ milestones, readonly, onUpdate }: Props) {
  // localProgress is the single source of truth for bar positions.
  // It is seeded from props on first render and NOT reset on subsequent
  // prop changes — that was the root cause of the rollback bug.
  const initialized = useRef(false);
  const [localProgress, setLocalProgress] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const name of EXECUTION_MILESTONES) init[name] = 0;
    for (const m of milestones) init[m.milestoneName] = m.progress;
    return init;
  });

  // When the component receives genuinely new props (e.g. user navigates to
  // a different package), reset local state. We detect this by comparing the
  // full set of (name, progress) pairs, but only when not currently saving.
  const savingBars = useRef<Set<string>>(new Set());
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savingSet, setSavingSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    // Build the server-side snapshot
    const serverSnapshot: Record<string, number> = {};
    for (const name of EXECUTION_MILESTONES) serverSnapshot[name] = 0;
    for (const m of milestones) serverSnapshot[m.milestoneName] = m.progress;

    // Only update bars that are NOT currently saving to avoid overwriting
    // in-flight changes with stale server data.
    setLocalProgress(prev => {
      const next = { ...prev };
      for (const name of EXECUTION_MILESTONES) {
        if (!savingBars.current.has(name)) {
          next[name] = serverSnapshot[name];
        }
      }
      return next;
    });
  }, [milestones]);

  const getProgress = (name: string) => localProgress[name] ?? 0;

  const overallPct =
    EXECUTION_MILESTONES.reduce((s, n) => s + getProgress(n), 0) / EXECUTION_MILESTONES.length;
  const doneCount = EXECUTION_MILESTONES.filter(n => getProgress(n) === 100).length;

  // Debounced commit — each bar has its own timer so simultaneous saves
  // are fully independent and don't interfere with each other.
  const handleCommit = useCallback((name: string, v: number) => {
    // Cancel any previously scheduled save for this bar
    if (saveTimers.current[name]) clearTimeout(saveTimers.current[name]);

    saveTimers.current[name] = setTimeout(async () => {
      savingBars.current.add(name);
      setSavingSet(new Set(savingBars.current));
      try {
        await onUpdate(name, v);
      } finally {
        savingBars.current.delete(name);
        setSavingSet(new Set(savingBars.current));
      }
    }, 120);
  }, [onUpdate]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Execution Milestones</h3>
          <span className="text-xs text-slate-400 ml-1">({doneCount}/{EXECUTION_MILESTONES.length} complete)</span>
        </div>
        <span className={`text-xs font-mono font-semibold ${overallPct >= 100 ? "text-emerald-600" : "text-slate-700"}`}>
          {overallPct.toFixed(0)}%
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
          <span>Overall completion</span>
          <span className="font-mono">{overallPct.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${overallPct >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
            style={{ width: `${Math.min(100, overallPct)}%` }}
          />
        </div>
      </div>

      {/* Milestone rows */}
      <div className="divide-y divide-slate-100 pb-2">
        {EXECUTION_MILESTONES.map((name, i) => {
          const prog = getProgress(name);
          const done = prog === 100;

          return (
            <div key={name} className="px-5 py-3 flex items-center gap-3">
              {/* Step indicator */}
              <div className="flex-shrink-0 w-5 flex items-center justify-center">
                {done
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <span className="text-[10px] font-bold text-slate-400">{i + 1}</span>
                }
              </div>

              {/* Name */}
              <span className={`text-xs font-medium flex-shrink-0 w-40 truncate ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                {name}
              </span>

              {/* Draggable bar */}
              <div className="flex-1 min-w-0">
                <DraggableBar
                  value={prog}
                  onChange={(v) => setLocalProgress(prev => ({ ...prev, [name]: v }))}
                  onCommit={(v) => handleCommit(name, v)}
                  readonly={readonly}
                  saving={savingSet.has(name)}
                />
              </div>

              {/* Percentage label */}
              <span className={`text-xs font-mono font-semibold w-9 text-right flex-shrink-0 ${
                done ? "text-emerald-600" : prog > 0 ? "text-blue-600" : "text-slate-400"
              }`}>
                {prog}%
              </span>
            </div>
          );
        })}
      </div>

      {!readonly && (
        <p className="px-5 pb-3 text-[10px] text-slate-400">
          Drag each bar to set milestone progress
        </p>
      )}
    </div>
  );
}
