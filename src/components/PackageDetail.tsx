"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import {
  fetchPackage,
  fetchProject,
  punchAward,
  updatePackage,
  addVendor,
  updateVendor,
  deleteVendor,
  addRemark,
  addDocument,
  deleteDocument,
  addInvoice,
  deleteInvoice,
  addCashInflow,
  deleteCashInflow,
  addCashOutflow,
  deleteCashOutflow,
  updateMilestoneProgress,
  addMilestoneTask,
  updateMilestoneTask,
  deleteMilestoneTask,
  addVendorRevision,
  deleteVendorRevision,
} from "@/lib/store";
import { STAGES, CURRENCY_SYMBOLS, formatCurrency } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthContext";
import { useConfirm } from "@/components/ConfirmDialog";
import UserMenu from "@/components/UserMenu";
import StageStepper from "@/components/StageStepper";
import VendorMatrix from "@/components/VendorMatrix";
import AuditTrail from "@/components/AuditTrail";
import RemarksSection from "@/components/RemarksSection";
import DocumentsSection from "@/components/DocumentsSection";
import BillingSection from "@/components/BillingSection";
import MilestoneTracker from "@/components/MilestoneTracker";
import ProgressRemarksPanel from "@/components/ProgressRemarksPanel";
import {
  ArrowLeft, Package, ChevronRight, ChevronDown, Lock, Unlock, CheckCircle2, Clock, AlertTriangle, Activity, CalendarDays,
  TrendingUp, TrendingDown, Plus, Trash2,
} from "lucide-react";

export default function PackageDetail({
  projectId,
  packageId,
  mode = "purchasing",
  onBack,
}: {
  projectId: string;
  packageId: string;
  mode?: "purchasing" | "execution";
  onBack: () => void;
}) {
  const { user, editMode, setEditMode } = useAuth();
  const confirm = useConfirm();
  const router = useRouter();
  const [pkg, setPkg]         = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  // Optimistic stage — set immediately on click so the stepper updates
  // without waiting for the API round-trip.
  const [optimisticStage, setOptimisticStage] = useState<string | null>(null);
  const [stageToast, setStageToast]           = useState<string | null>(null);

  // Award modal state
  const [punchingAward, setPunchingAward] = useState(false);
  const [awardVal, setAwardVal]           = useState("");
  const [awardVendor, setAwardVendor]     = useState("");
  const [awardError, setAwardError]       = useState<string | null>(null);
  const [awarding, setAwarding]           = useState(false);

  // Cash Inflow state
  const [showInflowForm, setShowInflowForm] = useState(false);
  const [inflowForm, setInflowForm] = useState({ onAccount: '', fromParty: '', dateReceived: '', amount: '', remarks: '' });
  const [inflowSaving, setInflowSaving] = useState(false);
  const [inflowError, setInflowError]   = useState<string | null>(null);
  const [inflowExpanded, setInflowExpanded] = useState(true);

  // Cash Outflow state
  const [showOutflowForm, setShowOutflowForm] = useState(false);
  const [outflowForm, setOutflowForm] = useState({ toWhom: '', onAccountOf: '', datePaid: '', amount: '', remarks: '' });
  const [outflowSaving, setOutflowSaving] = useState(false);
  const [outflowError, setOutflowError]   = useState<string | null>(null);
  const [outflowExpanded, setOutflowExpanded] = useState(true);

  // ── Data loading ──────────────────────────────────────────────────────────

  /** Re-fetch only the package (after any mutation). Fast — 5 parallel queries. */
  const reloadPackage = useCallback(async () => {
    const data = await fetchPackage(packageId);
    setPkg(data);
  }, [packageId]);

  /** Full load on mount: package + project summary (for budget constraint). */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pkgData, projData] = await Promise.all([
          fetchPackage(packageId),
          fetchProject(projectId),
        ]);
        setPkg(pkgData);
        setProject(projData);
      } catch (e) {
        console.error("Failed to load package", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [packageId, projectId]);

  // Non-admin users cannot edit a project that is not Active.
  const isProjectLocked = project?.status !== 'Active' && user?.role !== 'admin';
  const effectiveEditMode = editMode && !isProjectLocked;

  // Auto-enable Edit Mode in execution flow so milestone bars are immediately draggable.
  useEffect(() => {
    if (mode === "execution" && !isProjectLocked) setEditMode(true);
  }, [mode, isProjectLocked]);

  // ── Derived values ────────────────────────────────────────────────────────

  // Use optimisticStage while a save is in-flight for instant UI response
  const displayStage  = optimisticStage ?? pkg?.currentStage;
  const isAwarded     = displayStage === "Award";
  const stageIdx      = displayStage ? STAGES.indexOf(displayStage) : -1;
  const progressPct   = ((stageIdx + 1) / STAGES.length) * 100;

  // Available budget for award modal
  const otherAwarded = (project?.packages || [])
    .filter((p: any) => p.currentStage === "Award" && p.id !== packageId)
    .reduce((s: number, p: any) => s + (p.awardValue || 0), 0);
  const availableBudget = (project?.budget || 0) - otherAwarded;
  const enteredVal      = parseFloat(awardVal) || 0;
  const wouldExceed     = enteredVal > availableBudget;

  const leadTime = pkg ? (() => {
    if (!pkg.rfqFloatDate) return null;
    const start = new Date(pkg.rfqFloatDate).getTime();
    const end   = pkg.awardDate ? new Date(pkg.awardDate).getTime() : Date.now();
    const diff  = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return pkg.awardDate ? `${diff} days` : `${diff} days (live)`;
  })() : null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStageChange = (stage: string) => {
    if (!effectiveEditMode) return;
    if (stage === "Award") {
      setAwardVal(pkg?.awardValue?.toString() || "");
      setAwardVendor("");
      setPunchingAward(true);
      return;
    }
    // Instant optimistic update — UI changes before the network request even starts.
    const prev = pkg?.currentStage ?? null;
    setOptimisticStage(stage);
    setStageToast(null);

    // Fire-and-forget: API updates in background, user isn't blocked.
    updatePackage(packageId, { currentStage: stage }, user?.fullName)
      .then(() => reloadPackage().then(() => setOptimisticStage(null)))
      .catch((err: any) => {
        // Revert the optimistic update and surface a dismissible failure notice.
        setOptimisticStage(prev);
        setStageToast(err?.message || 'Stage update failed — please try again');
      });
  };

  const handlePunchAward = async () => {
    if (!awardVal || !awardVendor) return;
    setAwardError(null);
    setAwarding(true);
    try {
      await punchAward(projectId, packageId, parseFloat(awardVal), awardVendor, user?.fullName);
      setPunchingAward(false);
      setAwardVal(""); setAwardVendor("");
      // Reload both so project's available budget is fresh for any re-award
      const [pkgData, projData] = await Promise.all([
        fetchPackage(packageId),
        fetchProject(projectId),
      ]);
      setPkg(pkgData);
      setProject(projData);
    } catch (e: any) {
      setAwardError(e.message || "Award failed");
    } finally {
      setAwarding(false);
    }
  };

  const handleAddInflow = async () => {
    if (!inflowForm.onAccount || !inflowForm.fromParty || !inflowForm.dateReceived || !inflowForm.amount) return;
    const inflowAmt = parseFloat(inflowForm.amount);
    if (isNaN(inflowAmt) || inflowAmt <= 0) { setInflowError('Amount must be a positive number.'); return; }
    setInflowSaving(true); setInflowError(null);
    try {
      const record = await addCashInflow(packageId, {
        onAccount: inflowForm.onAccount,
        fromParty: inflowForm.fromParty,
        dateReceived: inflowForm.dateReceived,
        amount: inflowAmt,
        remarks: inflowForm.remarks || undefined,
      });
      // Instant optimistic update — no full reload needed
      setPkg((prev: any) => prev ? {
        ...prev,
        cashInflow: [...(prev.cashInflow || []), record],
        totalInflowAmount: (prev.totalInflowAmount || 0) + record.amount,
      } : prev);
      setInflowForm({ onAccount: '', fromParty: '', dateReceived: '', amount: '', remarks: '' });
      setShowInflowForm(false);
    } catch (e: any) {
      setInflowError(e.message || 'Failed to save');
    } finally {
      setInflowSaving(false);
    }
  };

  const handleAddOutflow = async () => {
    if (!outflowForm.toWhom || !outflowForm.onAccountOf || !outflowForm.datePaid || !outflowForm.amount) return;
    const outflowAmt = parseFloat(outflowForm.amount);
    if (isNaN(outflowAmt) || outflowAmt <= 0) { setOutflowError('Amount must be a positive number.'); return; }
    setOutflowSaving(true); setOutflowError(null);
    try {
      const record = await addCashOutflow(packageId, {
        toWhom: outflowForm.toWhom,
        onAccountOf: outflowForm.onAccountOf,
        datePaid: outflowForm.datePaid,
        amount: outflowAmt,
        remarks: outflowForm.remarks || undefined,
      });
      // Instant optimistic update — no full reload needed
      setPkg((prev: any) => prev ? {
        ...prev,
        cashOutflow: [...(prev.cashOutflow || []), record],
        totalOutflowAmount: (prev.totalOutflowAmount || 0) + record.amount,
      } : prev);
      setOutflowForm({ toWhom: '', onAccountOf: '', datePaid: '', amount: '', remarks: '' });
      setShowOutflowForm(false);
    } catch (e: any) {
      setOutflowError(e.message || 'Failed to save');
    } finally {
      setOutflowSaving(false);
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Loading package…</p>
      </div>
    );
  }
  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 bg-slate-50">
        Package not found.
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition flex-shrink-0"
              title="Home"
            >
              <Package className="w-5 h-5 text-white" />
            </button>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden">
              <span className="text-slate-400 truncate hidden sm:block max-w-[120px]">{project?.name}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 hidden sm:block" />
              <span className="text-slate-400 truncate hidden md:block max-w-[120px]">{pkg.category}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 hidden md:block" />
              <span className="font-semibold text-slate-900 truncate">{pkg.name}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {user?.canEdit && !isProjectLocked && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition ${
                  editMode
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
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

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Project-locked banner */}
        {isProjectLocked && project && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800">
            <Lock className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>
              This project is <strong>{project.status}</strong>. All editing is disabled. Contact an admin to reactivate it.
            </span>
          </div>
        )}

        {/* ── EXECUTION MODE BANNER ───────────────────────────────────────── */}
        {mode === "execution" && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
            <Activity className="w-3.5 h-3.5 flex-shrink-0" />
            Execution view — update milestone progress below. Go back to see the full procurement record.
          </div>
        )}

        {/* ── PACKAGE HEADER CARD ─────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-xl font-semibold text-slate-900">{pkg.name}</h1>
                {isAwarded && (
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Awarded
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">{pkg.origin}</span>
                <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-medium">{pkg.currency}</span>
                <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-medium">{pkg.category}</span>
                {leadTime && (
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" />{leadTime}
                  </span>
                )}
              </div>
            </div>

            {isAwarded && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500 mb-1">Award Value</p>
                <p className="text-2xl font-mono font-bold text-emerald-700 leading-none">
                  {formatCurrency(pkg.awardValue || 0, pkg.currency)}
                </p>
                {pkg.awardedVendorId && (
                  <p className="text-xs text-slate-500 mt-1">{pkg.awardedVendorId}</p>
                )}
              </div>
            )}
          </div>

          {/* Execution timeline — shown when task dates have been set */}
          {(pkg.startDate || pkg.endDate) && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>Execution timeline</span>
              <span className="font-semibold text-slate-700">
                {pkg.startDate ? new Date(pkg.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "TBD"}
              </span>
              <span className="text-slate-300">→</span>
              <span className="font-semibold text-slate-700">
                {pkg.endDate ? new Date(pkg.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "TBD"}
              </span>
            </div>
          )}
        </div>

        {/* ── PROCUREMENT SECTIONS (purchasing flow only) ─────────────────── */}
        {mode !== "execution" && (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-sm font-semibold text-slate-900">Procurement Timeline</p>
                {isAwarded && (
                  <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    Awarded to {pkg.awardedVendorId} · {formatCurrency(pkg.awardValue || 0, pkg.currency)}
                  </p>
                )}
              </div>
              {isAwarded && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-4">
                  <Lock className="w-3 h-3 flex-shrink-0" />
                  Package is locked — no edits allowed after award. Invoices can still be recorded up to the award value.
                </div>
              )}
              <StageStepper
                currentStage={displayStage ?? pkg.currentStage}
                readonly={!effectiveEditMode || isAwarded}
                onStageChange={handleStageChange}
              />
              {stageToast && (
                <div className="flex items-center justify-between gap-3 mt-1 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <span>⚠ {stageToast}</span>
                  <button type="button" onClick={() => setStageToast(null)} className="text-red-400 hover:text-red-600 font-bold leading-none">✕</button>
                </div>
              )}
            </div>

            <VendorMatrix
              vendors={pkg.vendors}
              currency={pkg.currency}
              awardedVendorId={pkg.awardedVendorId}
              awardValue={pkg.awardValue}
              readonly={!effectiveEditMode || isAwarded}
              onUpdate={async (vid: any, updates: any) => { await updateVendor(packageId, vid, updates); await reloadPackage(); }}
              onAdd={async (v: any) => { await addVendor(packageId, v, user?.fullName); await reloadPackage(); }}
              onDelete={async (vid: any) => { await deleteVendor(packageId, vid, user?.fullName); await reloadPackage(); }}
              onAddRevision={async (vid: string, data: { amount: number; notes: string }) => {
                const rev = await addVendorRevision(packageId, vid, data);
                await reloadPackage();
                return rev;
              }}
              onDeleteRevision={async (vid: string, rid: string) => {
                await deleteVendorRevision(packageId, vid, rid);
                await reloadPackage();
              }}
              onSelectWinner={(v: any) => {
                setAwardVendor(v.name);
                setAwardVal(v.revisedAmount.toString());
                setPunchingAward(true);
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RemarksSection
                remarks={pkg.remarks}
                readonly={!effectiveEditMode || isAwarded}
                currentUserId={user?.id}
                isAdmin={user?.role === 'admin'}
                onAddRemark={async (t: any) => { await addRemark(packageId, t, user?.fullName); await reloadPackage(); }}
                onEditRemark={async (rid, text) => {
                  await apiFetch(`/api/packages/${packageId}/remarks/${rid}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text }),
                  }).then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.error); }); });
                  await reloadPackage();
                }}
                onDeleteRemark={async (rid) => {
                  await apiFetch(`/api/packages/${packageId}/remarks/${rid}`, { method: 'DELETE' })
                    .then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.error); }); });
                  await reloadPackage();
                }}
              />
              <DocumentsSection
                documents={pkg.documents}
                packageId={packageId}
                userId={user?.id ?? ""}
                orgId={user?.orgId}
                readonly={!effectiveEditMode || isAwarded}
                onAddDocument={async (d) => { await addDocument(packageId, d, user?.fullName); await reloadPackage(); }}
                onDeleteDocument={async (did: string) => { await deleteDocument(packageId, did, user?.fullName); await reloadPackage(); }}
              />
            </div>
          </>
        )}

        {/* ── BILLING + MILESTONES — execution flow only ───────────────── */}
        {mode === "execution" && isAwarded && (
          <div className="grid gap-6 grid-cols-1">
            <BillingSection
              invoices={pkg.invoices || []}
              awardValue={pkg.awardValue || 0}
              currency={pkg.currency}
              readonly={!effectiveEditMode}
              onAddInvoice={async (inv) => {
                const record = await addInvoice(packageId, inv);
                setPkg((prev: any) => prev ? {
                  ...prev,
                  invoices: [...(prev.invoices || []), record],
                  billedAmount: (prev.billedAmount || 0) + record.amount,
                } : prev);
              }}
              onDeleteInvoice={async (iid) => {
                const removed = (pkg.invoices || []).find((i: any) => i.id === iid);
                setPkg((prev: any) => prev ? {
                  ...prev,
                  invoices: (prev.invoices || []).filter((i: any) => i.id !== iid),
                  billedAmount: Math.max(0, (prev.billedAmount || 0) - (removed?.amount || 0)),
                } : prev);
                await deleteInvoice(packageId, iid);
              }}
            />

            {/* ── CASH INFLOW ─────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Cash Inflow</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{(pkg.cashInflow || []).length}</span>
                </div>
                {effectiveEditMode && (
                  <button
                    onClick={() => setShowInflowForm(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Record Receipt
                  </button>
                )}
              </div>

              {/* Summary bar */}
              {(pkg.cashInflow || []).length > 0 && (() => {
                const total = (pkg.cashInflow || []).reduce((s: number, r: any) => s + r.amount, 0);
                const award = pkg.awardValue || 0;
                const pct   = award > 0 ? Math.min(100, (total / award) * 100) : 0;
                return (
                  <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-emerald-700 font-medium">Total Received</span>
                      <span className="font-mono font-semibold text-emerald-800">{formatCurrency(total, pkg.currency)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-emerald-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-emerald-600 mt-1">{pct.toFixed(1)}% of award value</p>
                  </div>
                );
              })()}

              {/* Form */}
              {showInflowForm && (
                <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">On Account Of</label>
                      <input value={inflowForm.onAccount} onChange={e => setInflowForm(f => ({ ...f, onAccount: e.target.value }))}
                        placeholder="e.g. Milestone 1 payment"
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">From Party</label>
                      <input value={inflowForm.fromParty} onChange={e => setInflowForm(f => ({ ...f, fromParty: e.target.value }))}
                        placeholder="e.g. Client Name"
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Date Received</label>
                      <input type="date" value={inflowForm.dateReceived} onChange={e => setInflowForm(f => ({ ...f, dateReceived: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Amount ({pkg.currency})</label>
                      <input type="number" min="0.01" step="any" value={inflowForm.amount} onChange={e => setInflowForm(f => ({ ...f, amount: e.target.value }))}
                        placeholder="0"
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Remarks (optional)</label>
                    <input value={inflowForm.remarks} onChange={e => setInflowForm(f => ({ ...f, remarks: e.target.value }))}
                      placeholder="Any notes…"
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white" />
                  </div>
                  {inflowError && <p className="text-xs text-red-600">{inflowError}</p>}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowInflowForm(false); setInflowError(null); }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">Cancel</button>
                    <button onClick={handleAddInflow} disabled={inflowSaving}
                      className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50">
                      {inflowSaving ? 'Saving…' : 'Save Receipt'}
                    </button>
                  </div>
                </div>
              )}

              {/* List */}
              {(pkg.cashInflow || []).length === 0 && !showInflowForm ? (
                <p className="text-xs text-slate-400 text-center py-4">No receipts recorded yet</p>
              ) : (pkg.cashInflow || []).length > 0 && (
                <div>
                  <button
                    onClick={() => setInflowExpanded(v => !v)}
                    className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 py-1.5 mb-1 transition"
                  >
                    <span className="font-medium">{(pkg.cashInflow || []).length} {(pkg.cashInflow || []).length === 1 ? 'entry' : 'entries'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${inflowExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {inflowExpanded && (
                    <div className="overflow-x-auto rounded-xl border border-emerald-100">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-emerald-50 text-left">
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">On Account Of</th>
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">From Party</th>
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date Received</th>
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-right whitespace-nowrap">Amount</th>
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Remarks</th>
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">User</th>
                            {effectiveEditMode && <th className="w-8" />}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-50">
                          {(pkg.cashInflow || []).map((r: any, idx: number) => (
                            <tr key={r.id} className="hover:bg-emerald-50/40 transition-colors">
                              <td className="px-3 py-2.5 text-slate-400">{idx + 1}</td>
                              <td className="px-3 py-2.5 text-slate-700 font-medium">{r.onAccount}</td>
                              <td className="px-3 py-2.5 text-slate-600">{r.fromParty}</td>
                              <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                                {new Date(r.dateReceived).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                                {formatCurrency(r.amount, pkg.currency)}
                              </td>
                              <td className="px-3 py-2.5 text-slate-400 italic">{r.remarks || '—'}</td>
                              <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{r.createdBy || '—'}</td>
                              {effectiveEditMode && (
                                <td className="px-2 py-2.5">
                                  <button onClick={async () => {
                                      if (!await confirm("Delete this cash receipt? This cannot be undone.")) return;
                                      setPkg((prev: any) => prev ? { ...prev, cashInflow: (prev.cashInflow || []).filter((x: any) => x.id !== r.id), totalInflowAmount: Math.max(0, (prev.totalInflowAmount || 0) - r.amount) } : prev);
                                      await deleteCashInflow(packageId, r.id);
                                    }}
                                    className="p-1 text-slate-300 hover:text-red-500 transition">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── CASH OUTFLOW ─────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Cash Outflow</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{(pkg.cashOutflow || []).length}</span>
                </div>
                {effectiveEditMode && (
                  <button
                    onClick={() => setShowOutflowForm(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Record Payment
                  </button>
                )}
              </div>

              {/* Summary bar */}
              {(pkg.cashOutflow || []).length > 0 && (() => {
                const total = (pkg.cashOutflow || []).reduce((s: number, r: any) => s + r.amount, 0);
                const award = pkg.awardValue || 0;
                const pct   = award > 0 ? Math.min(100, (total / award) * 100) : 0;
                return (
                  <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-red-700 font-medium">Total Paid Out</span>
                      <span className="font-mono font-semibold text-red-800">{formatCurrency(total, pkg.currency)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-red-100 overflow-hidden">
                      <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-red-600 mt-1">{pct.toFixed(1)}% of award value</p>
                  </div>
                );
              })()}

              {/* Form */}
              {showOutflowForm && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">To Whom</label>
                      <input value={outflowForm.toWhom} onChange={e => setOutflowForm(f => ({ ...f, toWhom: e.target.value }))}
                        placeholder="e.g. Vendor / Contractor"
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">On Account Of</label>
                      <input value={outflowForm.onAccountOf} onChange={e => setOutflowForm(f => ({ ...f, onAccountOf: e.target.value }))}
                        placeholder="e.g. Mobilisation advance"
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Date Paid</label>
                      <input type="date" value={outflowForm.datePaid} onChange={e => setOutflowForm(f => ({ ...f, datePaid: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Amount ({pkg.currency})</label>
                      <input type="number" min="0.01" step="any" value={outflowForm.amount} onChange={e => setOutflowForm(f => ({ ...f, amount: e.target.value }))}
                        placeholder="0"
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Remarks (optional)</label>
                    <input value={outflowForm.remarks} onChange={e => setOutflowForm(f => ({ ...f, remarks: e.target.value }))}
                      placeholder="Any notes…"
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 bg-white" />
                  </div>
                  {outflowError && <p className="text-xs text-red-600">{outflowError}</p>}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowOutflowForm(false); setOutflowError(null); }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">Cancel</button>
                    <button onClick={handleAddOutflow} disabled={outflowSaving}
                      className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50">
                      {outflowSaving ? 'Saving…' : 'Save Payment'}
                    </button>
                  </div>
                </div>
              )}

              {/* List */}
              {(pkg.cashOutflow || []).length === 0 && !showOutflowForm ? (
                <p className="text-xs text-slate-400 text-center py-4">No payments recorded yet</p>
              ) : (pkg.cashOutflow || []).length > 0 && (
                <div>
                  <button
                    onClick={() => setOutflowExpanded(v => !v)}
                    className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 py-1.5 mb-1 transition"
                  >
                    <span className="font-medium">{(pkg.cashOutflow || []).length} {(pkg.cashOutflow || []).length === 1 ? 'entry' : 'entries'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${outflowExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {outflowExpanded && (
                    <div className="overflow-x-auto rounded-xl border border-red-100">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-red-50 text-left">
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">To Whom</th>
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">On Account Of</th>
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date Paid</th>
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-right whitespace-nowrap">Amount</th>
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Remarks</th>
                            <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">User</th>
                            {effectiveEditMode && <th className="w-8" />}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-50">
                          {(pkg.cashOutflow || []).map((r: any, idx: number) => (
                            <tr key={r.id} className="hover:bg-red-50/40 transition-colors">
                              <td className="px-3 py-2.5 text-slate-400">{idx + 1}</td>
                              <td className="px-3 py-2.5 text-slate-700 font-medium">{r.toWhom}</td>
                              <td className="px-3 py-2.5 text-slate-600">{r.onAccountOf}</td>
                              <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                                {new Date(r.datePaid).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-red-700 whitespace-nowrap">
                                {formatCurrency(r.amount, pkg.currency)}
                              </td>
                              <td className="px-3 py-2.5 text-slate-400 italic">{r.remarks || '—'}</td>
                              <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{r.createdBy || '—'}</td>
                              {effectiveEditMode && (
                                <td className="px-2 py-2.5">
                                  <button onClick={async () => {
                                      if (!await confirm("Delete this payment record? This cannot be undone.")) return;
                                      setPkg((prev: any) => prev ? { ...prev, cashOutflow: (prev.cashOutflow || []).filter((x: any) => x.id !== r.id), totalOutflowAmount: Math.max(0, (prev.totalOutflowAmount || 0) - r.amount) } : prev);
                                      await deleteCashOutflow(packageId, r.id);
                                    }}
                                    className="p-1 text-slate-300 hover:text-red-500 transition">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {milestoneError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs text-red-700 flex items-center justify-between">
                <span>Milestone save failed: {milestoneError}</span>
                <button onClick={() => setMilestoneError(null)} className="ml-3 text-red-500 hover:text-red-700 font-bold">✕</button>
              </div>
            )}
            <MilestoneTracker
              milestones={pkg.milestones || []}
              readonly={!effectiveEditMode}
              onUpdate={async (name, progress) => {
                setMilestoneError(null);
                try {
                  await updateMilestoneProgress(packageId, name, progress, user?.fullName);
                } catch (e: any) {
                  const msg = e?.message || String(e);
                  console.error('Milestone save failed:', msg);
                  setMilestoneError(msg);
                  await reloadPackage();
                }
              }}
              onAddTask={async (milestoneName, name, startDate, endDate) => {
                setMilestoneError(null);
                try {
                  await addMilestoneTask(packageId, milestoneName, name, startDate, endDate);
                  await reloadPackage();
                } catch (e: any) {
                  setMilestoneError(e?.message || 'Failed to add task');
                }
              }}
              onUpdateTask={async (taskId, updates) => {
                try {
                  await updateMilestoneTask(packageId, taskId, updates);
                  // No reload for progress drags — MilestoneTracker owns local state.
                  // For name/date changes we reload to sync.
                  if (updates.name !== undefined || updates.startDate !== undefined || updates.endDate !== undefined) {
                    await reloadPackage();
                  }
                } catch (e: any) {
                  setMilestoneError(e?.message || 'Failed to update task');
                }
              }}
              onDeleteTask={async (taskId) => {
                setMilestoneError(null);
                try {
                  await deleteMilestoneTask(packageId, taskId);
                  await reloadPackage();
                } catch (e: any) {
                  setMilestoneError(e?.message || 'Failed to delete task');
                }
              }}
            />
            <ProgressRemarksPanel
              remarks={pkg.remarks || []}
              packageId={packageId}
              orgId={user?.orgId}
              readonly={!effectiveEditMode}
              onAddRemark={async (t, imageUrls, imageBytes) => { await addRemark(packageId, t, user?.fullName, imageUrls, imageBytes); await reloadPackage(); }}
            />
          </div>
        )}

        {/* ── AUDIT TRAIL ─────────────────────────────────────────────────── */}
        {mode !== "execution" && <AuditTrail entries={pkg.auditTrail} />}

      </main>

      {/* ── AWARD MODAL ─────────────────────────────────────────────────────── */}
      {punchingAward && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setPunchingAward(false); setAwardError(null); }}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-slate-900 mb-1">Award Package</h2>
            <p className="text-xs text-slate-500 mb-4">
              Final award details for <span className="font-medium">{pkg.name}</span>
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
                  Award Value ({CURRENCY_SYMBOLS[pkg.currency as keyof typeof CURRENCY_SYMBOLS]})
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
                    <AlertTriangle className="w-3 h-3" />
                    Exceeds available budget by {formatCurrency(enteredVal - availableBudget)}
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
                  <option value="">Select vendor…</option>
                  {pkg.vendors.map((v: any) => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {awardError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {awardError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setPunchingAward(false); setAwardError(null); }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePunchAward}
                disabled={awarding || !awardVal || !awardVendor || wouldExceed || availableBudget <= 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
              >
                {awarding ? "Awarding…" : "Confirm Award"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
