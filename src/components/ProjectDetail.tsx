"use client";

import { useState, useEffect } from "react";
import { fetchProject, addPackage, deletePackage, updatePackage, punchAward, addVendor, updateVendor, deleteVendor, addRemark, addDocument, deleteDocument, fetchCategories } from "@/lib/store";
import { STAGES, CURRENCY_SYMBOLS, formatCurrency } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthContext";
import StageStepper from "@/components/StageStepper";
import VendorMatrix from "@/components/VendorMatrix";
import AuditTrail from "@/components/AuditTrail";
import RemarksSection from "@/components/RemarksSection";
import DocumentsSection from "@/components/DocumentsSection";
import { ArrowLeft, Plus, Briefcase, Package, ChevronDown, ChevronUp, Trash2, X, Building2, Layers, DollarSign, Clock, LayoutGrid, CheckCircle2, Edit2, Settings, Tag, Search, Filter, Lock, Unlock } from "lucide-react";

export default function ProjectDetail({ projectId, onBack }: any) {
  const { user, editMode, setEditMode } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const [showAddPkg, setShowAddPkg] = useState(false);
  
  // Filters
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

  useEffect(() => {
    loadData();
  }, [projectId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">Loading Project...</div>;
  if (!project) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500 bg-gray-50">Project not found.</div>;

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
    await punchAward(projectId, punchingAward.id, parseFloat(awardVal), awardVendor);
    setPunchingAward(null); setAwardVal(""); setAwardVendor("");
    loadData();
  };

  const handleUpdateStage = async (pkgId: string, stage: string) => {
      if (!editMode) return;
      await updatePackage(pkgId, { currentStage: stage });
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
    return p.awardDate ? `${diff} Days` : `${diff} Days (In Progress)`;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl transition-all" title="Back"><ArrowLeft className="w-4 h-4 text-gray-500" /></button>
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100"><Briefcase className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-tight uppercase tracking-tight">{project.name}</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{project.client} • {formatCurrency(project.budget)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.canEdit && (
                <button 
                    onClick={() => setEditMode(!editMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 ${
                        editMode 
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                        : "bg-white border-gray-200 text-gray-400 hover:border-blue-500 hover:text-blue-600"
                    }`}
                >
                    {editMode ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {editMode ? "Edit Mode ON" : "Enter Edit Mode"}
                </button>
            )}
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-black text-xs border-2 border-blue-200 uppercase">{user?.fullName.charAt(0)}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
            <p className="text-sm font-black text-gray-900 uppercase">{project.status}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Packages</p>
            <p className="text-xl font-black text-gray-900">{project.packages.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Awarded</p>
            <p className="text-xl font-black text-emerald-600 font-mono">{formatCurrency(project.packages.reduce((s:any,p:any) => s + (p.awardValue||0), 0))}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Balance</p>
            <p className="text-xl font-black text-blue-600 font-mono">{formatCurrency(project.budget - project.packages.reduce((s:any,p:any) => s + (p.awardValue||0), 0))}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-8 shadow-sm flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input placeholder="Search packages..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex items-center gap-3">
            <select value={filterAwardStatus} onChange={e => setFilterAwardStatus(e.target.value)} className="text-xs font-bold border border-gray-100 rounded-xl px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-wider">
              <option value="All">All Status</option>
              <option value="Awarded">Awarded</option>
              <option value="Not Awarded">Not Awarded</option>
            </select>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-xs font-bold border border-gray-100 rounded-xl px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-wider">
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="text-xs font-bold border border-gray-100 rounded-xl px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-wider">
              <option value="All">All Stages</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {editMode && (
                <button onClick={() => setShowAddPkg(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-md shadow-blue-100 hover:bg-blue-700 transition-all ml-2">
                    <Plus className="w-4 h-4" /> Add Package
                </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {filteredPackages.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-black uppercase tracking-widest text-sm">No packages matching filters</p>
            </div>
          ) : (
            filteredPackages.map((pkg: any) => {
              const isExpanded = expandedPkg === pkg.id;
              const isAwarded = pkg.currentStage === "Award";
              const stageIdx = STAGES.indexOf(pkg.currentStage);
              const leadTime = calculateLeadTime(pkg);
              const progressPercent = ((stageIdx + 1) / STAGES.length) * 100;

              return (
                <div key={pkg.id} className={`bg-white rounded-2xl border transition-all shadow-sm ${isExpanded ? "ring-4 ring-blue-50 border-blue-500" : isAwarded ? "border-emerald-500 shadow-emerald-50" : "border-gray-100 hover:border-gray-200"}`}>
                  <div className="p-5" onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}>
                    <div className="flex flex-wrap items-center justify-between gap-4 cursor-pointer">
                      <div className="flex-1 min-w-[250px]">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-gray-900 uppercase tracking-tight text-base leading-none">{pkg.name}</h3>
                          <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase tracking-tighter border border-gray-200">{pkg.category}</span>
                          {isAwarded && <span className="text-[9px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 shadow-sm"><CheckCircle2 className="w-2.5 h-2.5" /> Awarded</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          <span className="bg-blue-50 text-blue-600 px-1.5 rounded">{pkg.origin}</span>
                          {leadTime && <span className="text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" /> {leadTime}</span>}
                        </div>
                      </div>

                      <div className="flex-1 min-w-[300px] max-w-[500px]">
                        <div className="relative h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-100 shadow-inner">
                          <div 
                            className={`absolute top-0 left-0 h-full transition-all duration-700 ease-out flex items-center justify-end pr-2 ${isAwarded ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]"}`}
                            style={{ width: `${progressPercent}%` }}
                          >
                            <span className="text-[8px] font-black text-white uppercase tracking-tighter whitespace-nowrap bg-black/10 px-1.5 py-0.5 rounded shadow-sm">
                              {pkg.currentStage}
                            </span>
                          </div>
                          {STAGES.map((_, idx) => (
                            <div 
                              key={idx} 
                              className="absolute top-0 h-full w-px bg-white/20" 
                              style={{ left: `${((idx + 1) / STAGES.length) * 100}%` }} 
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Award Value</p>
                          <p className={`text-base font-black font-mono leading-none ${isAwarded ? "text-emerald-600" : "text-gray-300"}`}>
                            {isAwarded ? formatCurrency(pkg.awardValue || 0, pkg.currency) : "---"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {editMode && (
                            <button onClick={(e) => { e.stopPropagation(); handleDeletePkg(pkg.id); }} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                          )}
                          <div className={`p-1 rounded-full transition-all ${isExpanded ? "bg-blue-600 text-white rotate-180" : "bg-gray-100 text-gray-400"}`}><ChevronDown className="w-4 h-4" /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50/20 animate-in slide-in-from-top duration-300">
                      <div className="mb-8 bg-white p-6 rounded-2xl border border-gray-200 shadow-inner">
                         <div className="flex items-center justify-between mb-6">
                           <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Detailed Procurement Timeline</p>
                           {isAwarded && <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Awarded to {pkg.awardedVendorId} for {formatCurrency(pkg.awardValue || 0, pkg.currency)}</p>}
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
                      <div className="grid grid-cols-1 gap-8">
                        <VendorMatrix 
                            vendors={pkg.vendors} 
                            currency={pkg.currency} 
                            awardedVendorId={pkg.awardedVendorId} 
                            awardValue={pkg.awardValue} 
                            readonly={!editMode}
                            onUpdate={(vid: any, updates: any) => { updateVendor(pkg.id, vid, updates); loadData(); }} 
                            onAdd={(v:any) => { addVendor(pkg.id, v); loadData(); }} 
                            onDelete={(vid:any) => { deleteVendor(pkg.id, vid); loadData(); }} 
                            onSelectWinner={(v: any) => { setPunchingAward(pkg); setAwardVendor(v.name); setAwardVal(v.revisedAmount.toString()); }} 
                        />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <RemarksSection remarks={pkg.remarks} readonly={!editMode} onAddRemark={(t:any) => { addRemark(pkg.id, t); loadData(); }} />
                          <DocumentsSection documents={pkg.documents} readonly={!editMode} onAddDocument={(d:any) => { addDocument(pkg.id, d); loadData(); }} onDeleteDocument={(did:any) => { deleteDocument(pkg.id, did); loadData(); }} />
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

        {showAddPkg && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddPkg(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">New Package</h2>
                <button onClick={() => setShowAddPkg(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-5">
                <div><label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Category</label><select value={newPkg.category} onChange={(e) => setNewPkg({...newPkg, category: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Package Name *</label><input value={newPkg.name} onChange={(e) => setNewPkg({...newPkg, name: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50" placeholder="e.g. Electrical Panels" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Origin</label><select value={newPkg.origin} onChange={(e) => setNewPkg({...newPkg, origin: e.target.value as any})} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"><option value="Domestic">Domestic</option><option value="Import">Import</option></select></div>
                  <div><label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Currency</label><select value={newPkg.currency} onChange={(e) => setNewPkg({...newPkg, currency: e.target.value as any})} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50">{Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3"><button onClick={handleAddPkg} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-100">Create Package</button></div>
            </div>
          </div>
        )}

        {punchingAward && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPunchingAward(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">Award Package</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Enter final details for {punchingAward.name}</p>
              <div className="space-y-5">
                <div><label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Award Value ({CURRENCY_SYMBOLS[punchingAward.currency as keyof typeof CURRENCY_SYMBOLS]})</label><input type="number" value={awardVal} onChange={(e) => setAwardVal(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 font-mono font-bold" autoFocus /></div>
                <div><label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Awarded Vendor</label><select value={awardVendor} onChange={(e) => setAwardVendor(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 font-bold"><option value="">Select Vendor...</option>{punchingAward.vendors.map((v:any) => <option key={v.id} value={v.name}>{v.name}</option>)}</select></div>
              </div>
              <div className="mt-8 flex justify-end gap-3"><button onClick={handlePunchAward} className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">Confirm Award</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
