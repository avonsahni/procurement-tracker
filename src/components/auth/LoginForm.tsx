"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { getCompanyInfo, CompanyInfo } from "@/lib/store";
import { Lock, Mail, User, ArrowRight, CheckCircle2 } from "lucide-react";

type Mode = "login" | "signup";

export default function LoginForm() {
  const [company, setCompany] = useState<CompanyInfo>({ name: "Procurement Dashboard", tagline: "Enterprise Access" });
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  useEffect(() => {
    getCompanyInfo().then(setCompany).catch(() => {});
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setConfirmMessage("");
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setConfirmMessage("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        const { needsConfirmation } = await signup(email, password, fullName);
        if (needsConfirmation) {
          setConfirmMessage(`Check ${email} to confirm your account, then sign in.`);
          setMode("login");
          setPassword("");
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-2">{company.name}</h1>
            <p className="text-sm text-slate-500">{company.tagline}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-1 p-1 mb-6 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                  mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                  mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
                  {error}
                </div>
              )}
              {confirmMessage && (
                <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{confirmMessage}</span>
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm text-slate-900 placeholder-slate-400 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm text-slate-900 placeholder-slate-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Min 8 characters" : ""}
                    minLength={mode === "signup" ? 8 : undefined}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm text-slate-900 placeholder-slate-400 transition"
                  />
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (mode === "login" ? "Signing in..." : "Creating account...") : (
                  <>
                    {mode === "login" ? "Enter Tracking Suite" : "Create Account"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {mode === "login" && (
              <p className="text-center text-xs text-slate-500 mt-6">
                New here?{" "}
                <button onClick={() => switchMode("signup")} className="text-blue-600 hover:text-blue-700 font-medium">
                  Create an account
                </button>
              </p>
            )}
            {mode === "signup" && (
              <p className="text-center text-xs text-slate-500 mt-6">
                Already registered?{" "}
                <button onClick={() => switchMode("login")} className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      <footer className="py-6 px-6 border-t border-slate-200 bg-white">
        <p className="text-center text-xs text-slate-400">© 2026 {company.name} · Internal Use Only</p>
      </footer>
    </div>
  );
}
