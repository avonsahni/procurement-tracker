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
  fetchCategories
} from "@/lib/store";
import { STAGES, CURRENCY_SYMBOLS, formatCurrency } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthContext";
import StageStepper from "@/components/StageStepper";
import VendorMatrix from "@/components/VendorMatrix";
import AuditTrail from "@/components/AuditTrail";
import RemarksSection from "@/components/RemarksSection";
import DocumentsSection from "@/components/DocumentsSection";
import {
  ArrowLeft, Plus, Briefcase, Package, ChevronDown, Trash2, X, Clock, CheckCircle2, Lock, Unlock, Search, Zap, Wrench, Hammer, Monitor, HardDrive
} from "lucide-react";

function getCategoryIcon(cat: string) {
  const c = cat.toLowerCase();
  if (c.includes("elect")) return <Zap className="w-3.5 h-3.5 text-amber-500" />;
  if (c.includes("mech") || c.includes("hvac") || c.includes("plumb")) return <Wrench className="w-3.5 h-3.5 text-blue-600" />;
  if (c.includes("civil") || c.includes("struct") || c.includes("paint")) return <Hammer className="w-3.5 h-3.5 text-emerald-600" />;
  if (c.includes("it") || c.includes("soft") || c.includes("network")) return <Monitor className="w-3.5 h-3.5 text-violet-600" />;
  return <Package className="w-3.5 h-3.5 text-slate-500" />;
}

export default function ProjectDetail({ projectId, onBack }: any) {
  const { user, editMode, setEditMode } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const [showAddPkg, setShowAddPkg] = useState(false);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterStage, setFilterStage] = useState("All");
  const [filterAwardStatus, setFilterAwardStatus] = useState("All");

  const [newPkg, setNewPkg] = useState({ name: "", category: "", origin: "Domestic", currency: "INR" });
  const [punchingAward, setPunchingAward] = useState<any>(null);
  const [awardVal, setAwardVal] = useState("");
  const [awardVendor, setAwardVendor] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [proj, cats] = await Promise.all([fetchProject(projectId), fetchCategories()]);
      setProject(proj);
      setCategories(cats);
      if (cats.length > 0) {
        setNewPkg(prev => ({ ...prev, category: prev.category || cats[0] }));
      }
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
  if (!project) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 bg-slate-50">Project not found.</div>;

  const filteredPackages = project.packages.filter((p: any) => {
    const isAwarded = p.currentStage === "Award";
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCat === "All" || p.category === filterCat;
    const matchesStage = filterStage === "All" || p.currentStage === filterStage;
    const matchesAward = filterAwardStatus === "All" ||
      (filterAwardStatus === "Awarded" && isAwarded) ||
      (filterAwardStatus === "Not Awarded" && !isAwarded);

    return matchesSearch && matchesCat && matchesStage && matchesAward;
  });

  const handleAddPkg = async () => {
    if (!newPkg.name.trim()) return;
    await addPackage(projectId, newPkg);
    setShowAddPkg(false);
    loadData();
  };

  const handlePunchAward = async () => {
    if (!punchingAward || !awardVal || !awardVendor) return;
    await punchAward(projectId, punchingAward.id, parseFloat(awardVal), awardVendor, user?.fullName);
    setPunchingAward(null); setAwardVal(""); setAwardVendor("");
    loadData();
  };

  const handleUpdateStage = async (pkgId: string, stage: string) => {
    if (!editMode) return;
    await updatePackage(pkgId, { currentStage: stage }, user?.fullName);
    loadData();
  };

  const handleDeletePkg = async (pkgId: string) => {
    if (!editMode) return;
    if (confirm("Delete package?")) {
      await deletePackage(pkgId);
      loadData();
    }
  };

  const calculateLeadTime = (p: any) => {
    if (!p.rfqFloatDate) return null;
    const start = new Date(p.rfqFloatDate).getTime();
    const end = p.awardDate ? new Date(p.awardDate).getTime() : new Date().getTime();
    const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return p.awardDate ? `${diff} days` : `${diff} days (in progress)`;
  };

  const awardedTotal = project.packages.reduce((s: any, p: any) => s + (p.awardValue || 0), 0);
  const remainingBudget = project.budget - awardedTotal;
  const awardPercent = project.budget > 0 ? (awardedTotal / project.budget) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition" title="Back"><ArrowLeft className="w-4 h-4" /></button>
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center"><Briefcase className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 leading-none">{project.name}</h1>
              <p className="text-xs text-slate-500 mt-1">{project.client} • {formatCurrency(project.budget)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
                {editMode ? "Edit Mode ON" : "Enter Edit Mode"}
              </button>
            )}
            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs border border-blue-200">{user?.fullName.charAt(0)}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* BUDGET RING */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Project Analytics</p>
            <h2 className="text-xl font-semibold text-slate-900">Contract Execution</h2>
            <p className="text-sm text-slate-500 max-w-xl">
              Budget breakdown and allocation status for work packages.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <span className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">{project.status}</span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <p className="text-xs text-slate-500 mb-1">Packages</p>
                <p className="text-base font-mono font-semibold text-slate-900">{project.packages.length}</p>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <p className="text-xs text-slate-500 mb-1">Remaining</p>
                <p className={`text-base font-mono font-semibold ${remainingBudget < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(remainingBudget)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 bg-slate-50 p-5 rounded-xl border border-slate-200 w-full md:w-auto">
            <div className="relative w-20 h-20 flex items-center justify-center mx-auto">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                <circle
                  cx="50" cy="50" r="40"
                  stroke="#2563eb"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - Math.min(1, awardPercent))}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-[10px] text-slate-500">Used</p>
                <p className="text-xs font-mono font-semibold text-slate-900">{(awardPercent * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="space-y-2 flex-1 md:flex-initial">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                <div>
                  <p className="text-[10px] text-slate-500 leading-none">Awarded</p>
                  <p className="text-xs font-mono font-semibold text-slate-900 mt-0.5">{formatCurrency(awardedTotal)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
                <div>
                  <p className="text-[10px] text-slate-500 leading-none">Total Budget</p>
                  <p className="text-xs font-mono font-semibold text-slate-700 mt-0.5">{formatCurrency(project.budget)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search packages..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterAwardStatus} onChange={e => setFilterAwardStatus(e.target.value)} className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="All">All Status</option>
              <option value="Awarded">Awarded</option>
              <option value="Not Awarded">Not Awarded</option>
            </select>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="All">All Stages</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {editMode && (
              <button onClick={() => setShowAddPkg(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition">
                <Plus className="w-4 h-4" /> Add Package
              </button>
            )}
          </div>
        </div>

        {/* PACKAGES */}
        <div className="space-y-3">
          {filteredPackages.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <HardDrive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No packages match filters</p>
            </div>
          ) : (
            filteredPackages.map((pkg: any) => {
              const isExpanded = expandedPkg === pkg.id;
              const isAwarded = pkg.currentStage === "Award";
              const stageIdx = STAGES.indexOf(pkg.currentStage);
              const leadTime = calculateLeadTime(pkg);
              const progressPercent = ((stageIdx + 1) / STAGES.length) * 100;

              return (
                <div key={pkg.id} className={`bg-white rounded-xl border transition overflow-hidden ${
                  isExpanded
                    ? "border-blue-300 shadow-sm"
                    : isAwarded
                      ? "border-emerald-200"
                      : "border-slate-200 hover:border-slate-300"
                }`}>
                  <div className="p-4" onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}>
                    <div className="flex flex-wrap items-center justify-between gap-4 cursor-pointer">

                      <div className="flex-1 min-w-[250px]">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {getCategoryIcon(pkg.category)}
                          <h3 className="font-semibold text-slate-900 text-sm leading-none">{pkg.name}</h3>
                          <span className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded">{pkg.category}</span>
                          {isAwarded && <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Awarded</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">{pkg.origin}</span>
                          {leadTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {leadTime}</span>}
                        </div>
                      </div>

                      <div className="flex-1 min-w-[220px] max-w-[450px]">
                        <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                              isAwarded ? "bg-emerald-500" : "bg-blue-600"
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">{pkg.currentStage}</p>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-0.5">Award Value</p>
                          <p className={`text-sm font-mono font-semibold leading-none ${isAwarded ? "text-emerald-600" : "text-slate-300"}`}>
                            {isAwarded ? formatCurrency(pkg.awardValue || 0, pkg.currency) : "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {editMode && (
                            <button onClick={(e) => { e.stopPropagation(); handleDeletePkg(pkg.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                          )}
                          <div className={`p-1.5 rounded-full transition ${isExpanded ? "bg-blue-600 text-white rotate-180" : "bg-slate-100 text-slate-500"}`}><ChevronDown className="w-3.5 h-3.5" /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 p-5 bg-slate-50/40">

                      <div className="mb-6 bg-white p-5 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                          <p className="text-xs font-medium text-slate-600">Procurement Timeline</p>
                          {isAwarded && <p className="text-xs font-medium text-emerald-700">Awarded to {pkg.awardedVendorId} for {formatCurrency(pkg.awardValue || 0, pkg.currency)}</p>}
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
                          <DocumentsSection documents={pkg.documents} readonly={!editMode} onAddDocument={async (name, size, type) => { await addDocument(pkg.id, { name, size, type }, user?.fullName); await loadData(); }} onDeleteDocument={async (did: any) => { await deleteDocument(pkg.id, did, user?.fullName); await loadData(); }} />
                        </div>
                        <AuditTrail entries={pkg.auditTrail} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* NEW PACKAGE MODAL */}
      {showAddPkg && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddPkg(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">New Package</h2>
              <button onClick={() => setShowAddPkg(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Category</label>
                <select value={newPkg.category} onChange={(e) => setNewPkg({ ...newPkg, category: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Package Name *</label>
                <input value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" placeholder="e.g. Electrical Panels" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Origin</label>
                  <select value={newPkg.origin} onChange={(e) => setNewPkg({ ...newPkg, origin: e.target.value as any })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
                    <option value="Domestic">Domestic</option>
                    <option value="Import">Import</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Currency</label>
                  <select value={newPkg.currency} onChange={(e) => setNewPkg({ ...newPkg, currency: e.target.value as any })} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
                    {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={handleAddPkg} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">Create Package</button>
            </div>
          </div>
        </div>
      )}

      {/* AWARD MODAL */}
      {punchingAward && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPunchingAward(null)}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-slate-900 mb-1">Award Package</h2>
            <p className="text-xs text-slate-500 mb-5">Enter final award details for {punchingAward.name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Award Value ({CURRENCY_SYMBOLS[punchingAward.currency as keyof typeof CURRENCY_SYMBOLS]})</label>
                <input type="number" value={awardVal} onChange={(e) => setAwardVal(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Awarded Vendor</label>
                <select value={awardVendor} onChange={(e) => setAwardVendor(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
                  <option value="">Select Vendor...</option>
                  {punchingAward.vendors.map((v: any) => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={handlePunchAward} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition">Confirm Award</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
