"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Users, Settings, Tag, Shield, BarChart3,
  Plus, Trash2, X, RefreshCw, Edit2, Crown, Eye,
  Building2, Palette, AlertTriangle, Check, Search,
  ChevronRight, Loader2, Globe, Key, UserPlus, Lock,
  Download, FileSpreadsheet, Package, Layers, Receipt, Activity,
  Clock, FolderOpen, UserCheck, UserMinus, Database, Zap,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  getUsers, addUser, updateUser, deleteUser, updateCompanyInfo,
  UserAccount, CompanyInfo,
} from "@/lib/store";
import { CURRENCY_LABELS } from "@/lib/types";

const API = (path: string, opts?: RequestInit) => {
  const headers = new Headers(opts?.headers);
  headers.set('X-Requested-With', 'fetch');
  return fetch(path, { ...opts, headers }).then(r => r.json());
};

// ─────────────────────── small sub-components ───────────────────────

function NavItem({
  icon: Icon, label, active, onClick,
}: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-blue-50 text-blue-700 border border-blue-200"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );
}

function StatCard({ label, value, sub, color = "blue" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`w-10 h-5 rounded-full p-0.5 transition flex-shrink-0 ${on ? "bg-blue-600" : "bg-slate-300"} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

// ─────────────────────── sections ───────────────────────

function OverviewSection({ users, orgName }: { users: UserAccount[]; orgName: string }) {
  const admins  = users.filter(u => u.role === "admin").length;
  const editors = users.filter(u => u.canEdit && u.role !== "admin").length;
  const viewers = users.filter(u => !u.canEdit && u.role !== "admin").length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Organisation Overview</h2>
        <p className="text-sm text-slate-500">{orgName}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"   value={users.length} color="blue"    sub="in this org" />
        <StatCard label="Admins"        value={admins}       color="violet"   sub="owner / admin" />
        <StatCard label="Editors"       value={editors}      color="emerald"  sub="can edit packages" />
        <StatCard label="View Only"     value={viewers}      color="amber"    sub="read access" />
      </div>

      {/* Plan validity */}
      <PlanValidityCard />

      {/* Storage usage */}
      <StorageUsageCard />

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">User Breakdown</h3>
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 ${u.role === "admin" ? "bg-blue-600" : "bg-slate-400"}`}>
                {u.fullName?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{u.fullName}</p>
                <p className="text-xs text-slate-500 truncate">{u.username}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === "admin" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "bg-slate-100 text-slate-600"}`}>
                {u.role === "admin" ? "Admin" : u.canEdit ? "Editor" : "Viewer"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PLAN_LIMITS: Record<string, number> = { trial: 3, starter: 10, pro: 50, enterprise: Infinity };
const PLAN_LABELS: Record<string, string> = { trial: 'Trial', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
const PLAN_COLORS: Record<string, string> = {
  trial:      'bg-slate-100 text-slate-600 border-slate-200',
  starter:    'bg-blue-50 text-blue-700 border-blue-200',
  pro:        'bg-violet-50 text-violet-700 border-violet-200',
  enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
};

function PlanUsageCard({ userCount }: { userCount: number }) {
  const { user } = useAuth();
  const plan  = user?.orgPlan ?? 'trial';
  const limit = PLAN_LIMITS[plan] ?? 3;
  const unlimited = limit === Infinity;
  const pct   = unlimited ? 0 : Math.min(100, Math.round((userCount / limit) * 100));
  const nearLimit = !unlimited && pct >= 80;
  const atLimit   = !unlimited && userCount >= limit;

  return (
    <div className={`rounded-xl border px-5 py-4 ${atLimit ? 'bg-red-50 border-red-200' : nearLimit ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Users className={`w-5 h-5 flex-shrink-0 ${atLimit ? 'text-red-500' : nearLimit ? 'text-amber-500' : 'text-slate-400'}`} />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-800">
                {unlimited ? `${userCount} users` : `${userCount} / ${limit} users`}
              </p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${PLAN_COLORS[plan]}`}>
                {PLAN_LABELS[plan]}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${atLimit ? 'text-red-600 font-medium' : nearLimit ? 'text-amber-600' : 'text-slate-500'}`}>
              {atLimit
                ? `User limit reached — upgrade to add more members`
                : unlimited
                ? 'Unlimited users on Enterprise plan'
                : `${limit - userCount} seat${limit - userCount === 1 ? '' : 's'} remaining on ${PLAN_LABELS[plan]} plan`}
            </p>
          </div>
        </div>
        {(atLimit || nearLimit) && !unlimited && (
          <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Upgrade plan
          </span>
        )}
      </div>

      {!unlimited && (
        <div className="mt-3">
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : nearLimit ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-slate-400">0</span>
            <span className="text-[10px] text-slate-400">{limit} max</span>
          </div>
        </div>
      )}
    </div>
  );
}


function PlanValidityCard() {
  const { user } = useAuth();
  const plan   = user?.orgPlan   ?? 'trial';
  const status = user?.orgStatus ?? 'trial';
  const expiryStr = user?.trialEndsAt ?? null;

  const fmtExpiry = (s: string) =>
    new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const daysLeft = expiryStr
    ? Math.ceil((new Date(expiryStr).getTime() - Date.now()) / 86_400_000)
    : null;

  const expired = daysLeft !== null && daysLeft < 0;
  const urgent  = !expired && daysLeft !== null && daysLeft <= 7;

  const STATUS_COLORS: Record<string, string> = {
    trial:    'bg-slate-100 text-slate-600 border-slate-200',
    active:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    paused:   'bg-amber-50 text-amber-700 border-amber-200',
    canceled: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className={`rounded-xl border px-5 py-4 ${expired ? 'bg-red-50 border-red-200' : urgent ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className={`w-5 h-5 flex-shrink-0 ${expired ? 'text-red-500' : urgent ? 'text-amber-500' : 'text-slate-400'}`} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-800">Subscription</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${PLAN_COLORS[plan]}`}>
                {PLAN_LABELS[plan]}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${STATUS_COLORS[status] ?? STATUS_COLORS['trial']}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            {expiryStr ? (
              <p className={`text-xs mt-0.5 ${expired ? 'text-red-600 font-semibold' : urgent ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                {expired
                  ? `Expired ${fmtExpiry(expiryStr)} — contact admin to renew`
                  : `Valid until ${fmtExpiry(expiryStr)} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`}
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">No expiry date set</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StorageUsageCard() {
  const [data, setData] = useState<{
    usedBytes: number; limitBytes: number; remainingBytes: number;
    pct: number; usedLabel: string; limitLabel: string; remainingLabel: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/storage/usage', {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'fetch' },
    })
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  const nearLimit = data.pct >= 80;
  const atLimit   = data.pct >= 100;

  return (
    <div className={`rounded-xl border px-5 py-4 ${atLimit ? 'bg-red-50 border-red-200' : nearLimit ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Database className={`w-5 h-5 flex-shrink-0 ${atLimit ? 'text-red-500' : nearLimit ? 'text-amber-500' : 'text-slate-400'}`} />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-800">
                {data.usedLabel} / {data.limitLabel} storage used
              </p>
              {atLimit && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide bg-red-100 text-red-700 border-red-200">
                  Full
                </span>
              )}
            </div>
            <p className={`text-xs mt-0.5 ${atLimit ? 'text-red-600 font-medium' : nearLimit ? 'text-amber-600' : 'text-slate-500'}`}>
              {atLimit
                ? 'Storage limit reached — no further uploads allowed'
                : `${data.remainingLabel} remaining (${data.pct}% used)`}
            </p>
          </div>
        </div>
        {(atLimit || nearLimit) && (
          <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Contact support to expand
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : nearLimit ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{ width: `${data.pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-400">0</span>
          <span className="text-[10px] text-slate-400">{data.limitLabel} max</span>
        </div>
      </div>
    </div>
  );
}

function UsersSection({ users, onRefresh }: { users: UserAccount[]; onRefresh: () => void }) {
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "user">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "user", canEdit: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = users.filter(u => {
    const matchesFilter = filter === "all" || u.role === filter;
    const matchesSearch = !search ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAdd = async () => {
    if (!form.email || !form.password) { setError("Email and password required"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setSaving(true); setError("");
    try {
      await addUser({ username: form.email, fullName: form.fullName, password: form.password, role: form.role as "admin" | "user", canEdit: form.canEdit });
      setForm({ fullName: "", email: "", password: "", role: "user", canEdit: true });
      setShowAdd(false);
      onRefresh();
    } catch (e: any) {
      setError(e.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this user from the organisation? This cannot be undone.")) return;
    try {
      await deleteUser(id);
      onRefresh();
    } catch (e: any) {
      alert(e.message || "Delete failed");
    }
  };

  const handleToggleEdit = async (u: UserAccount) => {
    try {
      await updateUser(u.id, { canEdit: !u.canEdit });
      onRefresh();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} account{users.length !== 1 ? "s" : ""} in this organisation</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
        >
          <UserPlus className="w-4 h-4" /> New User
        </button>
      </div>

      {/* Plan usage */}
      <PlanUsageCard userCount={users.length} />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>
        {(["all", "admin", "user"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {f === "all" ? "All" : f === "admin" ? "Admins" : "Users"}
          </button>
        ))}
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add New User</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name" className="px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30" />
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email address" type="email" className="px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30" />
            <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password (min 8 chars)" type="password" className="px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30" />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Toggle on={form.canEdit} onChange={v => setForm({ ...form, canEdit: v })} />
            <span className="text-sm text-slate-700">Can edit packages</span>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleAdd} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Creating…" : "Create User"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-white transition">Cancel</button>
          </div>
        </div>
      )}

      {/* User table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Can Edit</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">No users found</td></tr>
            ) : filtered.map(u => {
              const isMe = u.id === me?.id;
              return (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 ${u.role === "admin" ? "bg-blue-600" : "bg-slate-400"}`}>
                        {u.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{u.fullName} {isMe && <span className="text-xs text-slate-400 font-normal">(you)</span>}</p>
                        <p className="text-xs text-slate-500">{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${
                      u.role === "admin"
                        ? "bg-violet-50 text-violet-700 ring-violet-200"
                        : "bg-slate-100 text-slate-600 ring-slate-200"
                    }`}>
                      {u.role === "admin" ? <Crown className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {u.role === "admin" ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <Toggle on={u.canEdit} onChange={() => handleToggleEdit(u)} disabled={isMe} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {!isMe && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Remove user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Permission guide */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Crown, color: "amber", title: "Admin", desc: "Full access — manage users, settings & all projects" },
          { icon: Edit2, color: "blue",  title: "User + Edit", desc: "Can enter edit mode and modify packages" },
          { icon: Eye,   color: "slate", title: "View Only", desc: "Read-only access to all projects" },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 text-${color}-500 mt-0.5`} />
            <div>
              <p className="text-sm font-semibold text-slate-800">{title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandingSection({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<CompanyInfo>({ name: "", tagline: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/company").then(r => r.json()).then(d => {
      setForm({ name: d.name || "", tagline: d.tagline || "", contactEmail: d.contactEmail || "", primaryColor: d.primaryColor || "", defaultCurrency: d.defaultCurrency || "INR" });
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await updateCompanyInfo(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved();
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Company Branding</h2>
        <p className="text-sm text-slate-500 mt-0.5">Displayed on the login page and throughout the app — shared across your organisation.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Company Name</label>
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            placeholder="Acme Construction Ltd"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Tagline</label>
          <input
            value={form.tagline}
            onChange={e => setForm({ ...form, tagline: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            placeholder="Enterprise Source of Truth"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Contact Email</label>
          <input
            value={form.contactEmail || ""}
            onChange={e => setForm({ ...form, contactEmail: e.target.value })}
            type="email"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            placeholder="admin@company.com"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Default Currency</label>
          <select
            value={form.defaultCurrency || "INR"}
            onChange={e => setForm({ ...form, defaultCurrency: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          >
            {(Object.entries(CURRENCY_LABELS) as [string, string][]).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">Used as the default when creating new packages. Can be overridden per package.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 mt-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Branding"}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">🔒 Org-wide setting</p>
        <p className="text-xs text-blue-700">This branding applies to every user in your organisation. Changes are reflected immediately after the next page load.</p>
      </div>
    </div>
  );
}

function CategoriesSection() {
  const [cats, setCats] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/categories").then(r => r.json());
    setCats(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      await load();
    } finally { setAdding(false); }
  };

  const handleDelete = async (name: string) => {
    await fetch(`/api/categories/${encodeURIComponent(name)}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Package Categories</h2>
        <p className="text-sm text-slate-500 mt-0.5">Shared across your organisation — used to classify procurement packages.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex gap-2 mb-5">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="New category name…"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : cats.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">No categories yet. Add your first one above.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cats.map(c => (
              <div key={c} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 transition group">
                <Tag className="w-3 h-3 text-slate-400" />
                {c}
                <button
                  onClick={() => handleDelete(c)}
                  className="text-slate-300 hover:text-red-500 transition ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DangerSection({ onReset }: { onReset: () => void }) {
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSeed = async () => {
    if (!confirm("Load 5 sample projects (21 packages each)? This will be skipped if your organisation already has projects.")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { 'X-Requested-With': 'fetch' },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(body.error || `Seed failed (${res.status})`);
        return;
      }
      if (body.seeded === false) {
        alert("Sample data was skipped — your organisation already has projects.");
        return;
      }
      onReset();
    } finally { setSeeding(false); }
  };

  const handleReset = async () => {
    const confirmed = prompt('Type "WIPE" to delete all projects and packages permanently:');
    if (confirmed !== "WIPE") return;
    setResetting(true);
    try { await fetch("/api/reset", { method: "POST" }); onReset(); }
    finally { setResetting(false); }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Danger Zone</h2>
        <p className="text-sm text-slate-500 mt-0.5">Irreversible actions. Use with caution.</p>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Load Sample Data</p>
            <p className="text-xs text-slate-500 mt-0.5">Adds 5 projects with 21 packages each for testing purposes.</p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition disabled:opacity-50 flex-shrink-0"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {seeding ? "Loading…" : "Load Sample Data"}
          </button>
        </div>

        <div className="p-5 flex items-center justify-between gap-4 bg-red-50">
          <div>
            <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Wipe All Data</p>
            <p className="text-xs text-red-600 mt-0.5">Permanently deletes all projects, packages, vendors, documents and invoices. Cannot be undone.</p>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition disabled:opacity-50 flex-shrink-0"
          >
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {resetting ? "Wiping…" : "Wipe Database"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── audit log section ───────────────────────

type AuditEntry = {
  id: string;
  user_name: string;
  action: string;
  category: string;
  entity_name: string | null;
  details: Record<string, any> | null;
  created_at: string;
};

const CATEGORY_STYLES: Record<string, { color: string; icon: any }> = {
  user_mgmt: { color: 'text-violet-600 bg-violet-50 border-violet-200', icon: Users },
  project:   { color: 'text-blue-600 bg-blue-50 border-blue-200',       icon: FolderOpen },
  package:   { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: Package },
  settings:  { color: 'text-amber-600 bg-amber-50 border-amber-200',    icon: Settings },
  admin:     { color: 'text-red-600 bg-red-50 border-red-200',          icon: Database },
  general:   { color: 'text-slate-600 bg-slate-100 border-slate-200',   icon: Activity },
};

const ACTION_ICONS: Record<string, any> = {
  'User Invited':       UserPlus,
  'User Updated':       UserCheck,
  'User Removed':       UserMinus,
  'Project Created':    FolderOpen,
  'Project Deleted':    Trash2,
  'Package Awarded':    Zap,
  'Branding Updated':   Globe,
  'Category Added':     Tag,
  'Category Renamed':   Tag,
  'Category Deleted':   Trash2,
  'Data Exported':      Download,
  'Data Wiped':         AlertTriangle,
  'Sample Data Loaded': RefreshCw,
};

function fmtRelativeAudit(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function AuditLogSection() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/admin/audit').then(r => r.json());
      setEntries(Array.isArray(data) ? data : []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = ['all', 'user_mgmt', 'project', 'package', 'settings', 'admin'];

  const filtered = entries.filter(e => {
    const matchCat = filter === 'all' || e.category === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      e.action.toLowerCase().includes(q) ||
      e.user_name.toLowerCase().includes(q) ||
      (e.entity_name || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Audit Log</h2>
          <p className="text-sm text-slate-500 mt-0.5">Admin and high-value actions across your organisation (last 200).</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium transition">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search action, user, entity…"
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 w-64"
          />
        </div>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === cat ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat === 'all' ? 'All' : cat === 'user_mgmt' ? 'Users' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No audit entries yet</p>
            <p className="text-xs mt-1">Actions like inviting users, creating projects, and exporting data will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(entry => {
              const style = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES.general;
              const ActionIcon = ACTION_ICONS[entry.action] || Activity;
              return (
                <div key={entry.id} className="px-5 py-3.5 flex items-start gap-4 hover:bg-slate-50 transition">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${style.color}`}>
                    <ActionIcon className="w-3.5 h-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">{entry.action}</span>
                      {entry.entity_name && (
                        <span className="text-sm text-slate-500">— <span className="font-medium text-slate-700">{entry.entity_name}</span></span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">by <span className="font-medium">{entry.user_name}</span></span>
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <span className="text-xs text-slate-400 truncate max-w-[300px]">
                          · {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">{fmtRelativeAudit(entry.created_at)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(entry.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────── export section ───────────────────────

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('en-GB') : '';

function ExportSection({ orgName }: { orgName: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ projects: number; packages: number; vendors: number; invoices: number; milestones: number } | null>(null);

  const fetchPreview = useCallback(async () => {
    try {
      const data = await fetch('/api/export').then(r => r.json());
      setPreview({
        projects:   (data.projects   || []).length,
        packages:   (data.packages   || []).length,
        vendors:    (data.vendors    || []).length,
        invoices:   (data.invoices   || []).length,
        milestones: (data.milestones || []).length,
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  const handleExport = async () => {
    setLoading(true);
    setStatus('Fetching data…');
    try {
      const data = await fetch('/api/export').then(r => r.json());
      if (data.error) { setStatus(`Error: ${data.error}`); return; }

      setStatus('Building spreadsheet…');
      const XLSX = await import('xlsx');

      const wb = XLSX.utils.book_new();
      const now = new Date();

      // ── Sheet 1: Projects ───────────────────────────────
      const projectRows = [
        ['Project Name', 'Client', 'Budget (INR)', 'Status', 'Total Packages', 'Awarded Packages', 'Total Award Value', 'Total Billed', 'Created Date'],
        ...(data.projects || []).map((p: any) => {
          const pkgs = (data.packages || []).filter((pk: any) => pk.project_id === p.id);
          const awarded = pkgs.filter((pk: any) => pk.current_stage === 'Award');
          const awardVal = awarded.reduce((s: number, pk: any) => s + (Number(pk.award_value) || 0), 0);
          const billed   = awarded.reduce((s: number, pk: any) => s + (Number(pk.billedAmount) || 0), 0);
          return [
            p.name, p.client || '', Number(p.budget) || 0, p.status,
            pkgs.length, awarded.length,
            awardVal, billed,
            fmtDate(p.created_at),
          ];
        }),
      ];
      const wsProjects = XLSX.utils.aoa_to_sheet(projectRows);
      wsProjects['!cols'] = [30,25,18,12,16,18,20,18,14].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsProjects, 'Projects');

      // ── Sheet 2: Packages ───────────────────────────────
      const pkgRows = [
        ['Project', 'Client', 'Package Name', 'Category', 'Origin', 'Currency', 'Stage', 'Awarded Vendor', 'Award Value', 'Billed Amount', 'Created Date'],
        ...(data.packages || []).map((pk: any) => [
          pk.projectName, projectClientById(data.projects, pk.project_id),
          pk.name, pk.category || '', pk.origin || '', pk.currency || '',
          pk.current_stage || '', pk.awardedVendorName || '',
          Number(pk.award_value) || 0, Number(pk.billedAmount) || 0,
          fmtDate(pk.created_at),
        ]),
      ];
      const wsPkgs = XLSX.utils.aoa_to_sheet(pkgRows);
      wsPkgs['!cols'] = [25,20,30,16,12,10,22,25,18,18,14].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsPkgs, 'Packages');

      // ── Sheet 3: Vendors ────────────────────────────────
      const vendorRows = [
        ['Project', 'Package', 'Vendor Name', 'Quoted Amount', 'Revised Amount'],
        ...(data.vendors || []).map((v: any) => [
          v.projectName, v.packageName, v.name,
          Number(v.quoted_amount) || 0, Number(v.revised_amount) || 0,
        ]),
      ];
      const wsVendors = XLSX.utils.aoa_to_sheet(vendorRows);
      wsVendors['!cols'] = [25,30,30,18,18].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsVendors, 'Vendors');

      // ── Sheet 4: Invoices ───────────────────────────────
      const invoiceRows = [
        ['Project', 'Package', 'Invoice No.', 'Amount', 'Invoice Date', 'Notes', 'Uploaded By'],
        ...(data.invoices || []).map((inv: any) => [
          inv.projectName, inv.packageName,
          inv.invoice_number || '', Number(inv.amount) || 0,
          fmtDate(inv.invoice_date), inv.notes || '', inv.username || '',
        ]),
      ];
      const wsInvoices = XLSX.utils.aoa_to_sheet(invoiceRows);
      wsInvoices['!cols'] = [25,30,16,18,14,30,20].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsInvoices, 'Invoices');

      // ── Sheet 5: Milestones ─────────────────────────────
      const milestoneRows = [
        ['Project', 'Package', 'Milestone', 'Progress %', 'Completed At', 'Completed By'],
        ...(data.milestones || []).map((m: any) => [
          m.projectName, m.packageName,
          m.milestone_name, Number(m.progress) || 0,
          fmtDate(m.completed_at), m.completed_by || '',
        ]),
      ];
      const wsMilestones = XLSX.utils.aoa_to_sheet(milestoneRows);
      wsMilestones['!cols'] = [25,30,28,14,16,20].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsMilestones, 'Milestones');

      // ── Sheet 6: Summary ────────────────────────────────
      const totalBudget  = (data.projects || []).reduce((s: number, p: any) => s + (Number(p.budget) || 0), 0);
      const totalAwarded = (data.packages || []).filter((pk: any) => pk.current_stage === 'Award').reduce((s: number, pk: any) => s + (Number(pk.award_value) || 0), 0);
      const totalBilled  = (data.packages || []).reduce((s: number, pk: any) => s + (Number(pk.billedAmount) || 0), 0);
      const summaryRows = [
        ['Export Summary', ''],
        ['Exported At', now.toLocaleString('en-GB')],
        ['Organisation', orgName],
        ['', ''],
        ['Metric', 'Value'],
        ['Total Projects', (data.projects || []).length],
        ['Total Packages', (data.packages || []).length],
        ['Awarded Packages', (data.packages || []).filter((pk: any) => pk.current_stage === 'Award').length],
        ['Total Vendors', (data.vendors || []).length],
        ['Total Invoices', (data.invoices || []).length],
        ['Total Budget (INR)', totalBudget],
        ['Total Award Value (INR)', totalAwarded],
        ['Total Billed (INR)', totalBilled],
        ['Billing Rate (%)', totalAwarded > 0 ? +((totalBilled / totalAwarded) * 100).toFixed(1) : 0],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!cols'] = [28, 30].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // ── Download ─────────────────────────────────────────
      const dateStr = now.toISOString().slice(0, 10);
      const fileName = `${orgName.replace(/[^a-zA-Z0-9]/g, '_')}_export_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setStatus(`✓ Downloaded: ${fileName}`);
      setTimeout(() => setStatus(null), 5000);
    } catch (e: any) {
      setStatus(`Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Export Data</h2>
        <p className="text-sm text-slate-500 mt-0.5">Download a complete Excel workbook of all your organisation's procurement data.</p>
      </div>

      {/* Preview cards */}
      {preview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { icon: Layers,          label: 'Projects',   value: preview.projects },
            { icon: Package,         label: 'Packages',   value: preview.packages },
            { icon: Users,           label: 'Vendors',    value: preview.vendors },
            { icon: Receipt,         label: 'Invoices',   value: preview.invoices },
            { icon: Activity,        label: 'Milestones', value: preview.milestones },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <Icon className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sheets breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Workbook Contents (6 sheets)
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { sheet: 'Summary',    desc: 'High-level totals — budget, award value, billing rate, record counts' },
            { sheet: 'Projects',   desc: 'All projects with budget, status, awarded package count, billed amount' },
            { sheet: 'Packages',   desc: 'Every package — stage, category, origin, currency, award value, billed' },
            { sheet: 'Vendors',    desc: 'All vendor quotes (quoted and revised amounts) per package' },
            { sheet: 'Invoices',   desc: 'All invoice records with date, amount, invoice number and notes' },
            { sheet: 'Milestones', desc: 'Execution milestone progress per package (0–100% per milestone)' },
          ].map(({ sheet, desc }) => (
            <div key={sheet} className="px-5 py-3 flex items-start gap-3">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono mt-0.5 flex-shrink-0">{sheet}</span>
              <p className="text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Download button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2.5 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-sm"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />}
          {loading ? 'Generating…' : 'Download Excel (.xlsx)'}
        </button>
        {status && (
          <p className={`text-sm font-medium ${status.startsWith('✓') ? 'text-emerald-600' : status.startsWith('Failed') ? 'text-red-600' : 'text-slate-500'}`}>
            {status}
          </p>
        )}
      </div>

      <p className="text-xs text-slate-400">
        All amounts in the base currency of each package. Export includes all data visible to your organisation only.
      </p>
    </div>
  );
}

// Helper used inside ExportSection
function projectClientById(projects: any[], projectId: string): string {
  return projects.find((p: any) => p.id === projectId)?.client || '';
}

// ─────────────────────── main component ───────────────────────

type Tab = "overview" | "users" | "branding" | "categories" | "audit" | "export" | "danger";

const NAV: { id: Tab; icon: any; label: string }[] = [
  { id: "overview",    icon: BarChart3,     label: "Overview" },
  { id: "users",       icon: Users,         label: "Users" },
  { id: "branding",    icon: Globe,         label: "Branding" },
  { id: "categories",  icon: Tag,           label: "Categories" },
  { id: "audit",       icon: Clock,         label: "Audit Log" },
  { id: "export",      icon: Download,      label: "Export Data" },
  { id: "danger",      icon: AlertTriangle, label: "Danger Zone" },
];

// Tabs available when the org is expired/paused — read-only + export only.
const BLOCKED_TABS: Tab[] = ["overview", "audit", "export"];

export default function AdminPanel({ onBack, initialTab }: { onBack: () => void; initialTab?: Tab }) {
  const { isOrgBlocked } = useAuth();
  const defaultTab = isOrgBlocked ? "export" : (initialTab ?? "overview");
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [orgName, setOrgName] = useState("My Organisation");

  // When org becomes blocked, snap to an allowed tab
  useEffect(() => {
    if (isOrgBlocked && !BLOCKED_TABS.includes(tab)) {
      setTab("export");
    }
  }, [isOrgBlocked, tab]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  const loadBranding = useCallback(async () => {
    try {
      const info = await fetch("/api/company").then(r => r.json());
      if (info?.name) setOrgName(info.name);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadUsers();
    loadBranding();
  }, [loadUsers, loadBranding]);

  const visibleNav = isOrgBlocked
    ? NAV.filter(n => BLOCKED_TABS.includes(n.id))
    : NAV;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-900">Admin Panel</span>
            <span className="text-xs text-slate-400 ml-2">{orgName}</span>
          </div>
        </div>
        {isOrgBlocked && (
          <span className="ml-auto inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            <Lock className="w-3 h-3" /> Read-only mode
          </span>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 p-4 flex-shrink-0 sticky top-[61px] self-start h-[calc(100vh-61px)]">
          <nav className="space-y-1">
            {visibleNav.map(n => (
              <NavItem
                key={n.id}
                icon={n.icon}
                label={n.label}
                active={tab === n.id}
                onClick={() => setTab(n.id)}
              />
            ))}
          </nav>
          {isOrgBlocked && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-400 leading-snug">
                Other settings are locked while the subscription is inactive.
              </p>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          {tab === "overview"   && <OverviewSection  users={users} orgName={orgName} />}
          {tab === "users"      && <UsersSection     users={users} onRefresh={loadUsers} />}
          {tab === "branding"   && <BrandingSection  onSaved={loadBranding} />}
          {tab === "categories" && <CategoriesSection />}
          {tab === "audit"      && <AuditLogSection />}
          {tab === "export"     && <ExportSection    orgName={orgName} />}
          {tab === "danger"     && <DangerSection    onReset={() => { loadUsers(); }} />}
        </main>
      </div>
    </div>
  );
}
