"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  updateMilestoneProgress,
} from "@/lib/store";
import { STAGES, CURRENCY_SYMBOLS, formatCurrency } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthContext";
import UserMenu from "@/components/UserMenu";
import StageStepper from "@/components/StageStepper";
import VendorMatrix from "@/components/VendorMatrix";
import AuditTrail from "@/components/AuditTrail";
import RemarksSection from "@/components/RemarksSection";
import DocumentsSection from "@/components/DocumentsSection";
import BillingSection from "@/components/BillingSection";
import MilestoneTracker from "@/components/MilestoneTracker";
import {
  ArrowLeft, Package, ChevronRight, Lock, Unlock, CheckCircle2, Clock, AlertTriangle, Activity,
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
  const router = useRouter();
  const [pkg, setPkg]         = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  // Award modal state
  const [punchingAward, setPunchingAward] = useState(false);
  const [awardVal, setAwardVal]           = useState("");
  const [awardVendor, setAwardVendor]     = useState("");
  const [awardError, setAwardError]       = useState<string | null>(null);
  const [awarding, setAwarding]           = useState(false);

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

  // Auto-enable Edit Mode in execution flow so milestone bars are immediately draggable.
  useEffect(() => {
    if (mode === "execution") setEditMode(true);
  }, [mode]);

  // ── Derived values ────────────────────────────────────────────────────────

  const isAwarded     = pkg?.currentStage === "Award";
  const stageIdx      = pkg ? STAGES.indexOf(pkg.currentStage) : -1;
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

  const handleStageChange = async (stage: string) => {
    if (!editMode) return;
    if (stage === "Award") {
      setAwardVal(pkg?.awardValue?.toString() || "");
      setAwardVendor("");
      setPunchingAward(true);
    } else {
      await updatePackage(packageId, { currentStage: stage }, user?.fullName);
      await reloadPackage();
    }
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
            {user?.canEdit && (
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

          {/* Stage progress bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Stage Progress</span>
              <span className={`font-semibold ${isAwarded ? "text-emerald-700" : "text-blue-700"}`}>
                {pkg.currentStage}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isAwarded ? "bg-emerald-500" : "bg-blue-500"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
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
                currentStage={pkg.currentStage}
                readonly={!editMode || isAwarded}
                onStageChange={handleStageChange}
              />
            </div>

            <VendorMatrix
              vendors={pkg.vendors}
              currency={pkg.currency}
              awardedVendorId={pkg.awardedVendorId}
              awardValue={pkg.awardValue}
              readonly={!editMode || isAwarded}
              onUpdate={async (vid: any, updates: any) => { await updateVendor(packageId, vid, updates); await reloadPackage(); }}
              onAdd={async (v: any) => { await addVendor(packageId, v, user?.fullName); await reloadPackage(); }}
              onDelete={async (vid: any) => { await deleteVendor(packageId, vid, user?.fullName); await reloadPackage(); }}
              onSelectWinner={(v: any) => {
                setAwardVendor(v.name);
                setAwardVal(v.revisedAmount.toString());
                setPunchingAward(true);
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RemarksSection
                remarks={pkg.remarks}
                readonly={!editMode || isAwarded}
                onAddRemark={async (t: any) => { await addRemark(packageId, t, user?.fullName); await reloadPackage(); }}
              />
              <DocumentsSection
                documents={pkg.documents}
                packageId={packageId}
                userId={user?.id ?? ""}
                readonly={!editMode || isAwarded}
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
              readonly={!editMode}
              onAddInvoice={async (inv) => { await addInvoice(packageId, inv); await reloadPackage(); }}
              onDeleteInvoice={async (iid) => { await deleteInvoice(packageId, iid); await reloadPackage(); }}
            />
            {milestoneError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs text-red-700 flex items-center justify-between">
                <span>Milestone save failed: {milestoneError}</span>
                <button onClick={() => setMilestoneError(null)} className="ml-3 text-red-500 hover:text-red-700 font-bold">✕</button>
              </div>
            )}
            <MilestoneTracker
              milestones={pkg.milestones || []}
              readonly={!editMode}
              onUpdate={async (name, progress) => {
                setMilestoneError(null);
                try {
                  await updateMilestoneProgress(packageId, name, progress, user?.fullName);
                  await reloadPackage();
                } catch (e: any) {
                  const msg = e?.message || String(e);
                  console.error('Milestone save failed:', msg);
                  setMilestoneError(msg);
                  await reloadPackage();
                }
              }}
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
