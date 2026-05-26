"use client";

import { useRef, useState, useEffect } from "react";
import { ClipboardList, CheckCircle2 } from "lucide-react";
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
}: {
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  readonly?: boolean;
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
    <div
      ref={trackRef}
      className={`relative h-5 w-full ${readonly ? "cursor-default" : "cursor-ew-resize"} select-none`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Track */}
      <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${fillColor}`}
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
  );
}

export default function MilestoneTracker({ milestones, readonly, onUpdate }: Props) {
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const init: Record<string, number> = {};
    for (const m of milestones) init[m.milestoneName] = m.progress;
    setLocalProgress(init);
  }, [milestones]);

  const getProgress = (name: string) => localProgress[name] ?? 0;
  const isSeeded = milestones.length > 0;

  const overallPct = isSeeded
    ? EXECUTION_MILESTONES.reduce((s, n) => s + getProgress(n), 0) / EXECUTION_MILESTONES.length
    : 0;
  const doneCount = EXECUTION_MILESTONES.filter(n => getProgress(n) === 100).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Execution Milestones</h3>
          {isSeeded && (
            <span className="text-xs text-slate-400 ml-1">({doneCount}/{EXECUTION_MILESTONES.length} complete)</span>
          )}
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
      {!isSeeded ? (
        <div className="px-5 py-6 text-center text-xs text-slate-400 italic">
          Milestones are created when the package is awarded.
        </div>
      ) : (
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
                    onCommit={(v) => onUpdate(name, v)}
                    readonly={readonly}
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
      )}

      {!readonly && isSeeded && (
        <p className="px-5 pb-3 text-[10px] text-slate-400">
          Drag each bar to set milestone progress
        </p>
      )}
    </div>
  );
}
