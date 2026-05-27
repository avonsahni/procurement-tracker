"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Users, Settings, Tag, Shield, BarChart3,
  Plus, Trash2, X, RefreshCw, Edit2, Crown, Eye,
  Building2, Palette, AlertTriangle, Check, Search,
  ChevronRight, Loader2, Globe, Key, UserPlus, Lock,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  getUsers, addUser, updateUser, deleteUser, updateCompanyInfo,
  UserAccount, CompanyInfo,
} from "@/lib/store";

const API = (path: string, opts?: RequestInit) =>
  fetch(path, opts).then(r => r.json());

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
      setForm({ name: d.name || "", tagline: d.tagline || "", contactEmail: d.contactEmail || "", primaryColor: d.primaryColor || "" });
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
    if (!confirm("Load 5 sample projects (21 packages each)? This will add data on top of existing records.")) return;
    setSeeding(true);
    try { await fetch("/api/seed", { method: "POST" }); onReset(); }
    finally { setSeeding(false); }
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

// ─────────────────────── main component ───────────────────────

type Tab = "overview" | "users" | "branding" | "categories" | "danger";

const NAV: { id: Tab; icon: any; label: string }[] = [
  { id: "overview",    icon: BarChart3,   label: "Overview" },
  { id: "users",       icon: Users,       label: "Users" },
  { id: "branding",    icon: Globe,       label: "Branding" },
  { id: "categories",  icon: Tag,         label: "Categories" },
  { id: "danger",      icon: AlertTriangle, label: "Danger Zone" },
];

export default function AdminPanel({ onBack, initialTab }: { onBack: () => void; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "overview");
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [orgName, setOrgName] = useState("My Organisation");

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
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 p-4 flex-shrink-0 sticky top-[61px] self-start h-[calc(100vh-61px)]">
          <nav className="space-y-1">
            {NAV.map(n => (
              <NavItem
                key={n.id}
                icon={n.icon}
                label={n.label}
                active={tab === n.id}
                onClick={() => setTab(n.id)}
              />
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          {tab === "overview"   && <OverviewSection  users={users} orgName={orgName} />}
          {tab === "users"      && <UsersSection     users={users} onRefresh={loadUsers} />}
          {tab === "branding"   && <BrandingSection  onSaved={loadBranding} />}
          {tab === "categories" && <CategoriesSection />}
          {tab === "danger"     && <DangerSection    onReset={() => { loadUsers(); }} />}
        </main>
      </div>
    </div>
  );
}
