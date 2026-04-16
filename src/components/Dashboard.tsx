"use client";

import { useState, useEffect } from "react";
import { fetchProjects, addProject, deleteProject, updateProject, fetchCategories, addCategory, deleteCategory, updateCategory, resetTrackerData, getUsers, addUser, deleteUser, updateUserRights, getCompanyInfo, updateCompanyInfo, CompanyInfo, UserAccount } from "@/lib/store";
import { STAGES, formatCurrency } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthContext";
import {
  Plus, Briefcase, Package, ChevronRight, Search, Trash2, Edit2, Building2, X, FolderOpen, Activity, Clock, Settings, Tag, Save, LogOut, Lock, Unlock, UserPlus, Users, Trash, Globe, Shield, CheckCircle2, Box, Layers
} from "lucide-react";

const statusColors: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "On Hold": "bg-amber-50 text-amber-700 ring-amber-600/20",
  Completed: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

export default function Dashboard({ onSelectProject }: any) {
  const { user, logout, editMode, setEditMode } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showSettings, setShowAddSettings] = useState(false);
  
  // Settings state
  const [company, setCompany] = useState<CompanyInfo>({ name: "", tagline: "" });
  const [userList, setUserList] = useState<UserAccount[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserFull, setNewUserFull] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [newCatName, setNewCatName] = useState("");

  const [newProj, setNewProj] = useState({ name: "", client: "", budget: "" });
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, c, ci, u] = await Promise.all([fetchProjects(), fetchCategories(), getCompanyInfo(), getUsers()]);
      setProjects(p);
      setCategories(c);
      setCompany(ci);
      setUserList(u);
    } catch (e) {
      console.error("Load failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddProject = async () => {
    if (!newProj.name || !newProj.client || !newProj.budget) return;
    await addProject(newProj.name, newProj.client, parseFloat(newProj.budget));
    setShowAddProject(false); setNewProj({ name: "", client: "", budget: "" });
    loadData();
  };

  const handleDeleteProject = async (id: string) => {
    if (!editMode) return;
    if (confirm("Delete project and all its packages?")) {
      await deleteProject(id);
      loadData();
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.client.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: projects.length,
    packages: projects.reduce((s, p) => s + p.packages.length, 0),
    budget: projects.reduce((s, p) => s + p.budget, 0),
    awarded: projects.reduce((s, p) => s + p.packages.reduce((ss:any, pk:any) => ss + (pk.awardValue || 0), 0), 0)
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-[0.3em] text-gray-300">Syncing Systems...</div>;

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100 transform -rotate-3 transition-transform hover:rotate-0">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">{company.name}</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mt-1">{company.tagline}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                placeholder="Quick Search..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all w-64"
              />
            </div>
            
            {user?.canEdit && (
                <button 
                    onClick={() => setEditMode(!editMode)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 ${
                        editMode 
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 scale-105" 
                        : "bg-white border-gray-200 text-gray-400 hover:border-blue-500 hover:text-blue-600"
                    }`}
                >
                    {editMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {editMode ? "Edit Mode ON" : "Enter Edit Mode"}
                </button>
            )}

            {user?.role === 'admin' && (
                <button onClick={() => setShowAddSettings(true)} className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-500 transition-all">
                    <Settings className="w-5 h-5" />
                </button>
            )}

            <button onClick={logout} className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-red-600 transition-colors font-bold text-[10px] uppercase tracking-widest">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[ 
            { label: "Projects", val: stats.total, icon: FolderOpen, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Active Packages", val: stats.packages, icon: Box, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Total Budget", val: formatCurrency(stats.budget), icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Awarded Value", val: formatCurrency(stats.awarded), icon: Shield, color: "text-amber-600", bg: "bg-amber-50" }
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className={`${s.bg} p-3 rounded-2xl`}><s.icon className={`w-6 h-6 ${s.color}`} /></div>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Real-time</span>
              </div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-2xl font-black text-gray-900 leading-none">{s.val}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
            Project Portfolio
            <span className="bg-gray-100 text-gray-500 text-[10px] px-3 py-1 rounded-full">{filteredProjects.length} Total</span>
          </h2>
          {editMode && (
            <button onClick={() => setShowAddProject(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 hover:scale-105 transition-all active:scale-95">
                <Plus className="w-4 h-4" /> New Project
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-white rounded-[40px] border border-dashed border-gray-200">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6"><Layers className="w-10 h-10 text-gray-200" /></div>
              <p className="text-gray-400 font-black uppercase tracking-widest">Empty Portfolio</p>
            </div>
          ) : (
            filteredProjects.map((p: any) => (
              <div key={p.id} className="group bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[100px] -mr-10 -mt-10 group-hover:scale-110 transition-transform" />
                
                <div className="relative">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ring-1 ring-inset ${statusColors[p.status]}`}>{p.status}</span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{p.name}</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{p.client}</p>
                        </div>
                        {editMode && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                                className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-gray-50/80 p-4 rounded-2xl">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Budget</p>
                            <p className="text-sm font-black text-gray-900">{formatCurrency(p.budget)}</p>
                        </div>
                        <div className="bg-gray-50/80 p-4 rounded-2xl">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Items</p>
                            <p className="text-sm font-black text-gray-900">{p.packages.length}</p>
                        </div>
                        <div className="bg-gray-50/80 p-4 rounded-2xl">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Awarded</p>
                            <p className="text-sm font-black text-emerald-600">{formatCurrency(p.packages.reduce((s:any, pk:any) => s + (pk.awardValue||0), 0))}</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => onSelectProject(p.id)}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 group-hover:bg-blue-600 transition-all shadow-xl shadow-gray-200"
                    >
                        Access Repository <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {showAddProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setShowAddProject(false)}>
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-10 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">New Project</h2>
              <button onClick={() => setShowAddProject(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Project Identity</label>
                <input 
                  value={newProj.name} 
                  onChange={e => setNewProj({...newProj, name: e.target.value})} 
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold"
                  placeholder="e.g. SKYLINE RESIDENCY"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Client Representative</label>
                <input 
                  value={newProj.client} 
                  onChange={e => setNewProj({...newProj, client: e.target.value})} 
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold"
                  placeholder="e.g. DLF INFRASTRUCTURE"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Allocation Budget (INR)</label>
                <input 
                  type="number"
                  value={newProj.budget} 
                  onChange={e => setNewProj({...newProj, budget: e.target.value})} 
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-black"
                  placeholder="50,00,000"
                />
              </div>
            </div>

            <button 
              onClick={handleAddProject} 
              className="w-full mt-10 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] transition-all"
            >
              Initialize Project
            </button>
          </div>
        </div>
      )}

      {showSettings && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setShowAddSettings(false)}>
             <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl p-10 max-h-[90vh] overflow-y-auto animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-4"><Settings className="w-8 h-8 text-blue-600"/> System Control</h2>
                  <button onClick={() => setShowAddSettings(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <section>
                        <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><Globe className="w-4 h-4"/> Branding & Identity</h3>
                        <div className="space-y-4 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 mb-2 uppercase tracking-widest">Company Name</label>
                                <input value={company.name} onChange={e => setCompany({...company, name: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl font-bold" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 mb-2 uppercase tracking-widest">Slogan / Tagline</label>
                                <input value={company.tagline} onChange={e => setCompany({...company, tagline: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl font-bold" />
                            </div>
                            <button onClick={async () => { await updateCompanyInfo(company); loadData(); }} className="w-full py-3 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] mt-4 hover:bg-blue-600 transition-colors">Save Configuration</button>
                        </div>

                        <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mt-10 mb-6 flex items-center gap-2"><Tag className="w-4 h-4"/> Category Management</h3>
                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div className="flex gap-2 mb-4">
                                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New Category..." className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold" />
                                <button onClick={async () => { if(newCatName) { await addCategory(newCatName); setNewCatName(""); loadData(); } }} className="p-2 bg-blue-600 text-white rounded-xl"><Plus className="w-5 h-5"/></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(c => (
                                    <div key={c} className="group flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-black uppercase tracking-widest">
                                        {c}
                                        <button onClick={async () => { await deleteCategory(c); loadData(); }} className="text-gray-300 hover:text-red-600 transition-colors"><X className="w-3 h-3"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><Users className="w-4 h-4"/> Access Control</h3>
                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <div className="space-y-4 mb-6">
                                {userList.map(u => (
                                    <div key={u.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                                        <div>
                                            <p className="font-black text-gray-900 text-xs uppercase">{u.fullName}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">@{u.username} • {u.role}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[8px] font-black uppercase tracking-tighter text-gray-400 mb-1">Edit Rights</span>
                                                <button 
                                                    onClick={async () => { await updateUserRights(u.id, !u.canEdit); loadData(); }}
                                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${u.canEdit ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${u.canEdit ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            {u.role !== 'admin' && (
                                                <button onClick={async () => { await deleteUser(u.id); loadData(); }} className="p-2 text-gray-300 hover:text-red-600 transition-colors"><Trash className="w-4 h-4"/></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-200 pt-6">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Create New Account</p>
                                <div className="space-y-3">
                                    <input value={newUserFull} onChange={e => setNewUserFull(e.target.value)} placeholder="Full Name" className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold bg-white" />
                                    <div className="flex gap-3">
                                        <input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Username" className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold bg-white" />
                                        <input type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} placeholder="Pass" className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold bg-white" />
                                    </div>
                                    <button onClick={async () => { if(newUserName && newUserPass) { await addUser({ username: newUserName, fullName: newUserFull, password: newUserPass, role: "user", canEdit: false }); setNewUserName(""); setNewUserFull(""); setNewUserPass(""); loadData(); } }} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-100">Provision User</button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10">
                            <h3 className="text-[11px] font-black text-red-600 uppercase tracking-[0.3em] mb-4">Danger Zone</h3>
                            <button onClick={async () => { if(confirm("ABORT: This will wipe ALL database records. Proceed?")) { await resetTrackerData(); loadData(); } }} className="w-full py-4 border-2 border-red-100 text-red-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-50 transition-colors">Wipe System Database</button>
                        </div>
                    </section>
                </div>
             </div>
          </div>
      )}
    </div>
  );
}
