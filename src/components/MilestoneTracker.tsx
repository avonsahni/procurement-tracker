"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  ClipboardList, CheckCircle2, Loader2, ChevronDown, ChevronRight,
  Plus, Trash2, CalendarDays,
} from "lucide-react";
import { EXECUTION_MILESTONES, PackageMilestone, MilestoneTask } from "@/lib/types";

// ── DraggableBar ─────────────────────────────────────────────────────────────

function DraggableBar({
  value, onChange, onCommit, readonly, saving, size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  readonly?: boolean;
  saving?: boolean;
  size?: "sm" | "md";
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const clamp = (x: number): number => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100)));
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readonly) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(clamp(e.clientX));
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || readonly) return;
    onChange(clamp(e.clientX));
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    const v = clamp(e.clientX);
    onChange(v);
    onCommit(v);
  };

  const fill   = value === 100 ? "bg-emerald-500" : value > 0 ? "bg-blue-500" : "bg-slate-200";
  const border = value === 100 ? "border-emerald-500" : "border-blue-500";
  const h      = size === "sm" ? "h-4" : "h-5";
  const track  = size === "sm" ? "h-2" : "h-3";
  const thumb  = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="flex items-center gap-2 w-full">
      <div
        ref={trackRef}
        className={`relative ${h} flex-1 cursor-default select-none`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        style={{ cursor: readonly ? "default" : "ew-resize" }}
      >
        <div className={`absolute inset-0 top-1/2 -translate-y-1/2 ${track} rounded-full bg-slate-100 overflow-hidden`}>
          <div className={`h-full rounded-full transition-colors ${fill}`} style={{ width: `${value}%` }} />
        </div>
        {!readonly && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${thumb} bg-white border-2 ${border} rounded-full shadow pointer-events-none z-10`}
            style={{ left: `calc(${value}% - ${size === "sm" ? 8 : 10}px)` }}
          />
        )}
      </div>
      <div className="w-4 flex-shrink-0 flex items-center justify-center">
        {saving && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TaskUpdate {
  name?: string;
  progress?: number;
  startDate?: string | null;
  endDate?: string | null;
}

interface Props {
  milestones: PackageMilestone[];
  readonly?: boolean;
  /** No longer called from the UI — milestone progress is computed from subtasks. */
  onUpdate?: (milestoneName: string, progress: number) => Promise<void>;
  onAddTask?: (milestoneName: string, name: string, startDate?: string, endDate?: string) => Promise<void>;
  onUpdateTask?: (taskId: string, updates: TaskUpdate) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
}

// ── MilestoneTracker ──────────────────────────────────────────────────────────

export default function MilestoneTracker({
  milestones, readonly, onAddTask, onUpdateTask, onDeleteTask,
}: Props) {

  // ── Task progress state (drag bars on subtasks) ───────────────────────────
  const [taskProgress, setTaskProgress] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const m of milestones) for (const t of (m.tasks || [])) init[t.id] = t.progress;
    return init;
  });

  const savingTaskBars = useRef<Set<string>>(new Set());
  const taskTimers     = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savingTaskSet, setSavingTaskSet] = useState<Set<string>>(new Set());

  // Seed newly arriving tasks without overwriting in-progress drags
  const seededTaskIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const additions: Record<string, number> = {};
    for (const m of milestones) {
      for (const t of (m.tasks || [])) {
        if (!seededTaskIds.current.has(t.id)) {
          seededTaskIds.current.add(t.id);
          additions[t.id] = t.progress;
        }
      }
    }
    if (Object.keys(additions).length > 0) setTaskProgress(prev => ({ ...prev, ...additions }));
  }, [milestones]);

  // ── Task name/date editing state ──────────────────────────────────────────
  type TaskEdit = { name: string; startDate: string; endDate: string };
  const [taskEdits, setTaskEdits] = useState<Record<string, TaskEdit>>(() => {
    const init: Record<string, TaskEdit> = {};
    for (const m of milestones) {
      for (const t of (m.tasks || [])) {
        init[t.id] = { name: t.name, startDate: t.startDate ?? '', endDate: t.endDate ?? '' };
      }
    }
    return init;
  });
  const seededEditIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const additions: Record<string, TaskEdit> = {};
    for (const m of milestones) {
      for (const t of (m.tasks || [])) {
        if (!seededEditIds.current.has(t.id)) {
          seededEditIds.current.add(t.id);
          additions[t.id] = { name: t.name, startDate: t.startDate ?? '', endDate: t.endDate ?? '' };
        }
      }
    }
    if (Object.keys(additions).length > 0) setTaskEdits(prev => ({ ...prev, ...additions }));
  }, [milestones]);

  // ── Expand + add-form state ────────────────────────────────────────────────
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState<Record<string, boolean>>({});

  type AddForm = { name: string; startDate: string; endDate: string; busy: boolean };
  const [addForms, setAddForms] = useState<Record<string, AddForm>>({});
  const getAddForm = (n: string): AddForm =>
    addForms[n] ?? { name: '', startDate: '', endDate: '', busy: false };
  const setAddForm = (n: string, patch: Partial<AddForm>) =>
    setAddForms(prev => ({ ...prev, [n]: { ...getAddForm(n), ...patch } }));

  // ── Deleting state ─────────────────────────────────────────────────────────
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Milestone progress is always the average of its subtask progress.
  // If no tasks are defined the milestone shows 0%.
  const getMilestoneProgress = (name: string) => {
    const tasks = milestones.find(x => x.milestoneName === name)?.tasks ?? [];
    if (tasks.length === 0) return 0;
    const avg = tasks.reduce((s, t) => s + (taskProgress[t.id] ?? t.progress), 0) / tasks.length;
    return Math.round(avg);
  };

  const overallPct = EXECUTION_MILESTONES.reduce((s, n) => s + getMilestoneProgress(n), 0) / EXECUTION_MILESTONES.length;
  const doneCount  = EXECUTION_MILESTONES.filter(n => getMilestoneProgress(n) === 100).length;

  // Overall timeline: earliest start → latest end across all tasks
  const allTasks = milestones.flatMap(m => m.tasks ?? []);
  const allStarts = allTasks.map(t => taskEdits[t.id]?.startDate || t.startDate).filter(Boolean) as string[];
  const allEnds   = allTasks.map(t => taskEdits[t.id]?.endDate   || t.endDate).filter(Boolean) as string[];
  const timelineStart = allStarts.length ? allStarts.sort()[0] : null;
  const timelineEnd   = allEnds.length   ? allEnds.sort().reverse()[0] : null;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  // ── Commit handlers ────────────────────────────────────────────────────────

  const handleTaskProgressCommit = useCallback((taskId: string, v: number) => {
    if (taskTimers.current[taskId]) clearTimeout(taskTimers.current[taskId]);
    taskTimers.current[taskId] = setTimeout(async () => {
      savingTaskBars.current.add(taskId);
      setSavingTaskSet(new Set(savingTaskBars.current));
      try { await onUpdateTask?.(taskId, { progress: v }); }
      finally {
        savingTaskBars.current.delete(taskId);
        setSavingTaskSet(new Set(savingTaskBars.current));
      }
    }, 120);
  }, [onUpdateTask]);

  const handleTaskFieldBlur = useCallback(async (taskId: string) => {
    const e = taskEdits[taskId];
    if (!e || !onUpdateTask) return;
    await onUpdateTask(taskId, {
      name:      e.name || undefined,
      startDate: e.startDate || null,
      endDate:   e.endDate || null,
    });
  }, [taskEdits, onUpdateTask]);

  const openAddForm = (name: string) => {
    setExpanded(prev => ({ ...prev, [name]: true }));
    setShowAddForm(prev => ({ ...prev, [name]: true }));
  };

  const handleAddTask = async (milestoneName: string) => {
    const form = getAddForm(milestoneName);
    if (!form.name.trim() || !onAddTask) return;
    setAddForm(milestoneName, { busy: true });
    try {
      await onAddTask(milestoneName, form.name.trim(), form.startDate || undefined, form.endDate || undefined);
      setAddForm(milestoneName, { name: '', startDate: '', endDate: '', busy: false });
      setShowAddForm(prev => ({ ...prev, [milestoneName]: false }));
    } catch {
      setAddForm(milestoneName, { busy: false });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!onDeleteTask) return;
    setDeletingIds(prev => new Set(prev).add(taskId));
    try { await onDeleteTask(taskId); }
    finally { setDeletingIds(prev => { const s = new Set(prev); s.delete(taskId); return s; }); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2 flex-wrap">
          <ClipboardList className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <h3 className="font-semibold text-slate-900 text-sm">Execution Milestones</h3>
          <span className="text-xs text-slate-400">({doneCount}/{EXECUTION_MILESTONES.length} complete)</span>
          {(timelineStart || timelineEnd) && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 rounded-lg px-2 py-0.5 ml-1">
              <CalendarDays className="w-3 h-3 text-slate-400 flex-shrink-0" />
              {timelineStart ? fmtDate(timelineStart) : "?"}
              <span className="text-slate-300">→</span>
              {timelineEnd ? fmtDate(timelineEnd) : "?"}
            </span>
          )}
        </div>
        <span className={`text-xs font-mono font-semibold flex-shrink-0 ml-3 ${overallPct >= 100 ? "text-emerald-600" : "text-slate-700"}`}>
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
          const prog       = getMilestoneProgress(name);
          const done       = prog === 100;
          const isExpanded = !!expanded[name];
          const tasks      = milestones.find(x => x.milestoneName === name)?.tasks ?? [];
          const taskCount  = tasks.length;
          const canEdit    = !readonly && !!onAddTask;

          return (
            <div key={name}>
              {/* ── Milestone header row ── */}
              <div className="px-5 py-3 flex items-center gap-3">
                {/* Step indicator */}
                <div className="flex-shrink-0 w-5 flex items-center justify-center">
                  {done
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <span className="text-[10px] font-bold text-slate-400">{i + 1}</span>
                  }
                </div>

                {/* Name */}
                <span className={`text-xs font-medium flex-shrink-0 w-36 truncate ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                  {name}
                </span>

                {/* Progress bar — always read-only, computed from subtasks */}
                <div className="flex-1 min-w-0">
                  <DraggableBar
                    value={prog}
                    onChange={() => {}}
                    onCommit={() => {}}
                    readonly
                  />
                </div>

                {/* Percentage */}
                <span className={`text-xs font-mono font-semibold w-9 text-right flex-shrink-0 ${
                  done ? "text-emerald-600" : prog > 0 ? "text-blue-600" : "text-slate-400"
                }`}>
                  {prog}%
                </span>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [name]: !prev[name] }))}
                  className="flex-shrink-0 flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition"
                  title={isExpanded ? "Collapse" : "Expand tasks"}
                >
                  {taskCount > 0 && (
                    <span className="bg-slate-100 rounded px-1 py-0.5 font-semibold">{taskCount}</span>
                  )}
                  {isExpanded
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />
                  }
                </button>

                {/* Add tasks button — editor only */}
                {canEdit && (
                  <button
                    onClick={() => openAddForm(name)}
                    className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700 transition ml-1"
                    title="Add task"
                  >
                    <Plus className="w-3 h-3" />
                    tasks
                  </button>
                )}
              </div>

              {/* ── Task section (expanded) ── */}
              {isExpanded && (
                <div className="bg-slate-50/70 border-t border-slate-100 px-5 py-3 space-y-2">

                  {tasks.length === 0 && !canEdit && (
                    <p className="text-xs text-slate-400 italic">No tasks defined.</p>
                  )}

                  {tasks.map((task: MilestoneTask) => {
                    const tProg    = taskProgress[task.id] ?? task.progress;
                    const tEdit    = taskEdits[task.id] ?? { name: task.name, startDate: task.startDate ?? '', endDate: task.endDate ?? '' };
                    const tDone    = tProg === 100;
                    const deleting = deletingIds.has(task.id);

                    return (
                      <div key={task.id} className={`flex items-center gap-2 bg-white rounded-lg border border-slate-100 px-3 py-2 ${deleting ? "opacity-50" : ""}`}>

                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-0.5" />

                        {/* Task name */}
                        <input
                          type="text"
                          value={tEdit.name}
                          disabled={readonly || deleting}
                          onChange={e => setTaskEdits(prev => ({ ...prev, [task.id]: { ...tEdit, name: e.target.value } }))}
                          onBlur={() => handleTaskFieldBlur(task.id)}
                          className="flex-1 min-w-0 text-xs text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 outline-none py-0.5 disabled:cursor-default"
                          placeholder="Task name"
                        />

                        {/* Dates */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <CalendarDays className="w-3 h-3 text-slate-300" />
                          <input
                            type="date"
                            value={tEdit.startDate}
                            disabled={readonly || deleting}
                            onChange={e => setTaskEdits(prev => ({ ...prev, [task.id]: { ...tEdit, startDate: e.target.value } }))}
                            onBlur={() => handleTaskFieldBlur(task.id)}
                            className="text-[10px] text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 outline-none disabled:cursor-default w-24"
                          />
                          <span className="text-[10px] text-slate-300">→</span>
                          <input
                            type="date"
                            value={tEdit.endDate}
                            disabled={readonly || deleting}
                            onChange={e => setTaskEdits(prev => ({ ...prev, [task.id]: { ...tEdit, endDate: e.target.value } }))}
                            onBlur={() => handleTaskFieldBlur(task.id)}
                            className="text-[10px] text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 outline-none disabled:cursor-default w-24"
                          />
                        </div>

                        {/* Task progress bar — draggable */}
                        <div className="w-28 flex-shrink-0">
                          <DraggableBar
                            size="sm"
                            value={tProg}
                            onChange={v => setTaskProgress(prev => ({ ...prev, [task.id]: v }))}
                            onCommit={v => handleTaskProgressCommit(task.id, v)}
                            readonly={readonly || deleting}
                            saving={savingTaskSet.has(task.id)}
                          />
                        </div>

                        {/* % label */}
                        <span className={`text-[10px] font-mono font-semibold w-7 text-right flex-shrink-0 ${
                          tDone ? "text-emerald-600" : tProg > 0 ? "text-blue-600" : "text-slate-400"
                        }`}>
                          {tProg}%
                        </span>

                        {/* Delete */}
                        {!readonly && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={deleting}
                            className="flex-shrink-0 text-slate-300 hover:text-red-400 transition disabled:cursor-not-allowed ml-1"
                            title="Remove task"
                          >
                            {deleting
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add task form — shown only after clicking "+ tasks" */}
                  {canEdit && showAddForm[name] && (() => {
                    const form = getAddForm(name);
                    return (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 mt-1">
                        <input
                          autoFocus
                          type="text"
                          value={form.name}
                          onChange={e => setAddForm(name, { name: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddTask(name);
                            if (e.key === 'Escape') setShowAddForm(prev => ({ ...prev, [name]: false }));
                          }}
                          placeholder="Task name…"
                          className="flex-1 min-w-0 text-xs border border-blue-300 rounded px-2 py-1.5 outline-none focus:border-blue-500 bg-white text-slate-700 placeholder:text-slate-400"
                        />
                        <input
                          type="date"
                          value={form.startDate}
                          onChange={e => setAddForm(name, { startDate: e.target.value })}
                          className="text-[10px] border border-slate-200 rounded px-1.5 py-1.5 outline-none focus:border-blue-400 bg-white text-slate-500 w-28"
                        />
                        <input
                          type="date"
                          value={form.endDate}
                          onChange={e => setAddForm(name, { endDate: e.target.value })}
                          className="text-[10px] border border-slate-200 rounded px-1.5 py-1.5 outline-none focus:border-blue-400 bg-white text-slate-500 w-28"
                        />
                        <button
                          onClick={() => handleAddTask(name)}
                          disabled={!form.name.trim() || form.busy}
                          className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {form.busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          Add
                        </button>
                        <button
                          onClick={() => setShowAddForm(prev => ({ ...prev, [name]: false }))}
                          className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition text-xs"
                          title="Cancel"
                        >✕</button>
                      </div>
                    );
                  })()}

                  {/* Milestone date span */}
                  {tasks.length > 0 && (() => {
                    const starts = tasks.filter(t => (taskEdits[t.id]?.startDate || t.startDate)).map(t => taskEdits[t.id]?.startDate || t.startDate!).sort();
                    const ends   = tasks.filter(t => (taskEdits[t.id]?.endDate   || t.endDate)).map(t => taskEdits[t.id]?.endDate   || t.endDate!).sort();
                    if (!starts.length && !ends.length) return null;
                    const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
                    return (
                      <p className="text-[10px] text-slate-400 pt-1">
                        Milestone span: {starts[0] ? fmt(starts[0]) : "?"} → {ends[ends.length - 1] ? fmt(ends[ends.length - 1]) : "?"}
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!readonly && (
        <p className="px-5 pb-3 text-[10px] text-slate-400">
          Milestone progress auto-computes from subtasks · Click + tasks to add · Click ▶ to expand
        </p>
      )}
    </div>
  );
}
