"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { fetchAllData, getCompanyInfo, CompanyInfo } from "@/lib/store";
import { Briefcase, Lock, User, ShieldCheck, Eye, ArrowRight, Building2, Terminal } from "lucide-react";

export default function LoginForm() {
  const [company, setCompany] = useState<CompanyInfo>({ name: "Procurement Tracker", tagline: "Enterprise Access" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
      fetchAllData();
      setCompany(getCompanyInfo());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tryRole = async (role: "admin" | "viewer") => {
    const u = role === "admin" ? "admin" : "viewer";
    setUsername(u); setPassword("admin123");
    setLoading(true);
    try { await login(u, "admin123"); } 
    catch (err: any) { setError(err.message); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
            <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <div className="space-y-10 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">
              <Terminal className="w-3 h-3" /> Core Infrastructure
            </div>
            <div>
              <h1 className="text-7xl sm:text-8xl font-black text-white uppercase tracking-tighter leading-[0.8] mb-8">
                {company.name.split(' ').map((w,i) => <span key={i} className="block">{w}</span>)}
              </h1>
              <p className="text-xl text-gray-500 font-bold leading-tight uppercase tracking-tight max-w-sm mx-auto lg:mx-0">
                {company.tagline}
              </p>
            </div>
            <div className="pt-10 space-y-6">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em]">System Access Entry</p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                    <button onClick={() => tryRole("admin")} className="flex items-center gap-4 px-8 py-5 bg-white text-black rounded-3xl hover:bg-blue-500 hover:text-white transition-all shadow-2xl active:scale-95 group">
                        <ShieldCheck className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                        <div className="text-left"><p className="text-[9px] font-black uppercase tracking-tighter opacity-50 mb-0.5 leading-none">Access as</p><p className="font-black text-lg leading-none uppercase">Admin</p></div>
                    </button>
                    <button onClick={() => tryRole("viewer")} className="flex items-center gap-4 px-8 py-5 bg-white/5 text-white rounded-3xl border border-white/10 hover:bg-white/10 transition-all shadow-xl active:scale-95 group">
                        <Eye className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors" />
                        <div className="text-left"><p className="text-[9px] font-black uppercase tracking-tighter opacity-50 mb-0.5 leading-none">Access as</p><p className="font-black text-lg leading-none uppercase">Viewer</p></div>
                    </button>
                </div>
            </div>
          </div>
          <div className="bg-white rounded-[4rem] p-10 lg:p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-gray-100">
            <div className="mb-12">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Sign In</h2>
                <div className="h-1.5 w-10 bg-blue-600 rounded-full mt-3"></div>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              {error && <div className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100">{error}</div>}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">Username</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-gray-900" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-gray-900" />
                </div>
              </div>
              <button disabled={loading} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-[0.25em] text-[10px] shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-3">
                {loading ? "Authorizing..." : "Enter Tracking Suite"}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
      <footer className="py-10 px-8 bg-[#0a0a0b] border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900"><Briefcase className="w-4 h-4 text-white" /></div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">{company.name} Enterprise</span>
            </div>
            <p className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">© 2026 Internal Use Only • Protected Infrastructure</p>
        </div>
      </footer>
    </div>
  );
}
