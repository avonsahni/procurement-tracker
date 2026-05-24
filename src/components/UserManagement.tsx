"use client";

import { useState, useEffect } from "react";
import {
  getUsers, addUser, updateUser, deleteUser,
  UserAccount,
} from "@/lib/store";
import { useAuth } from "@/components/auth/AuthContext";
import {
  ArrowLeft, Plus, Users, Eye, Edit2, Trash2, X,
  Search, Key, UserCheck, UserX, Crown, ChevronRight,
  Lock, Unlock, RefreshCw, Check,
} from "lucide-react";

function Initials({ name, role }: { name: string; role: string }) {
  const letters = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const bg = role === "admin" ? "bg-blue-600" : "bg-slate-400";
  return (
    <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
      <span className="text-xs font-semibold text-white">{letters || "?"}</span>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return role === "admin" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 text-xs font-medium">
      <Crown className="w-3 h-3" /> Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200 text-xs font-medium">
      <Eye className="w-3 h-3" /> User
    </span>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`w-10 h-5 rounded-full p-0.5 transition flex-shrink-0 ${on ? "bg-blue-600" : "bg-slate-300"} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

interface UserModalProps {
  user?: UserAccount | null;
  onClose: () => void;
  onSave: () => void;
}

function UserModal({ user, onClose, onSave }: UserModalProps) {
  const isEdit = !!user;
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [changePass, setChangePass] = useState(false);
  const [role, setRole] = useState<"admin" | "user">(user?.role ?? "user");
  const [canEdit, setCanEdit] = useState(user?.canEdit ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Full name required"); return; }
    if (!isEdit && !username.trim()) { setError("Username required"); return; }
    if (!isEdit && !password.trim()) { setError("Password required"); return; }
    if (isEdit && changePass && !password.trim()) { setError("Enter a new password"); return; }

    setSaving(true);
    try {
      if (isEdit) {
        const updates: any = { fullName: fullName.trim(), role, canEdit };
        if (changePass) updates.password = password;
        await updateUser(user!.id, updates);
      } else {
        await addUser({ username: username.trim(), fullName: fullName.trim(), password, role, canEdit });
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
              {isEdit ? <Edit2 className="w-4 h-4 text-blue-600" /> : <UserCheck className="w-4 h-4 text-emerald-600" />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {isEdit ? "Edit User" : "New User"}
              </h3>
              <p className="text-xs text-slate-500">
                {isEdit ? `@${user?.username}` : "Provision access"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-slate-400"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Username</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                placeholder="e.g. janesmith"
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg font-mono text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-slate-400"
              />
            </div>
          )}

          {!isEdit ? (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-slate-400"
              />
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => { setChangePass(!changePass); setPassword(""); }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
              >
                <span className="flex items-center gap-2 text-sm text-slate-700">
                  <Key className="w-3.5 h-3.5" /> Change Password
                </span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${changePass ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                  {changePass && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
              </button>
              {changePass && (
                <div className="px-3 pb-3 pt-2 bg-white">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="New password"
                    autoFocus
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-slate-400"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
              <div className="flex rounded-lg overflow-hidden border border-slate-200">
                {(["user", "admin"] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2 text-xs font-medium transition cursor-pointer ${
                      role === r
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {r === "admin" ? "Admin" : "User"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Edit Access</label>
              <div
                className={`h-[34px] px-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${canEdit ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"}`}
                onClick={() => setCanEdit(!canEdit)}
              >
                <span className={`text-xs font-medium ${canEdit ? "text-blue-700" : "text-slate-500"}`}>
                  {canEdit ? "Enabled" : "Disabled"}
                </span>
                <Toggle on={canEdit} onChange={setCanEdit} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition"
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
          </button>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ user, onCancel, onConfirm }: { user: UserAccount; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-10 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserX className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-center text-base font-semibold text-slate-900 mb-1">Remove User?</h3>
        <p className="text-center text-sm text-slate-500 mb-5">
          <span className="text-slate-700 font-medium">{user.fullName}</span> (@{user.username}) will lose all access.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">Remove</button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement({ onBack }: { onBack: () => void }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "user">("all");
  const [editingUser, setEditingUser] = useState<UserAccount | null | undefined>(undefined);
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try { setUsers(await getUsers()); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleDelete = async () => {
    if (!deletingUser) return;
    await deleteUser(deletingUser.id);
    setDeletingUser(null);
    loadUsers();
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === "admin").length,
    editors: users.filter(u => u.canEdit).length,
    viewOnly: users.filter(u => !u.canEdit).length,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-slate-900 leading-none">User Management</h1>
                <p className="text-xs text-slate-500 mt-1">{stats.total} accounts</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadUsers}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditingUser(null)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" /> New User
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Users", val: stats.total, icon: Users, accent: "text-blue-700" },
            { label: "Admins", val: stats.admins, icon: Crown, accent: "text-amber-700" },
            { label: "Can Edit", val: stats.editors, icon: Unlock, accent: "text-emerald-700" },
            { label: "View Only", val: stats.viewOnly, icon: Lock, accent: "text-slate-700" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.accent}`} />
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
              <p className={`text-xl font-mono font-semibold ${s.accent}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search users…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
            />
          </div>
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            {(["all", "admin", "user"] as const).map(r => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`px-3.5 py-2 text-xs font-medium transition cursor-pointer ${
                  filterRole === r ? "bg-slate-100 text-slate-900" : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {r === "all" ? "All" : r}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No users found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(u => {
              const isCurrentUser = u.id === currentUser?.id;
              const isAdmin = u.role === "admin";
              return (
                <div
                  key={u.id}
                  className={`group bg-white border rounded-xl px-5 py-3.5 flex items-center gap-4 transition hover:border-slate-300 ${
                    isCurrentUser ? "border-blue-200" : "border-slate-200"
                  }`}
                >
                  <Initials name={u.fullName} role={u.role} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{u.fullName}</p>
                      <RoleBadge role={u.role} />
                      {isCurrentUser && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">@{u.username}</p>
                  </div>

                  <div className="flex flex-col items-center gap-1 px-3">
                    <span className="text-xs text-slate-400">Edit</span>
                    <Toggle
                      on={u.canEdit}
                      disabled={isAdmin}
                      onChange={async (v) => {
                        await updateUser(u.id, { canEdit: v });
                        loadUsers();
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-700 rounded-lg text-xs font-medium text-slate-600 transition"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    {!isAdmin && !isCurrentUser && (
                      <button
                        onClick={() => setDeletingUser(u)}
                        className="p-1.5 bg-white border border-slate-200 hover:border-red-200 hover:text-red-600 rounded-lg text-slate-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition" />
                </div>
              );
            })}
          </div>
        )}

        {/* Permission legend */}
        <div className="mt-8 p-5 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Permission Guide</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Crown className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-700">Admin</p>
                <p className="text-slate-500 mt-0.5">Full access — manage users &amp; settings</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Unlock className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-700">User + Edit</p>
                <p className="text-slate-500 mt-0.5">Can enter edit mode to modify packages</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Eye className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-700">User (View Only)</p>
                <p className="text-slate-500 mt-0.5">Read-only access to all projects</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {editingUser !== undefined && (
        <UserModal user={editingUser} onClose={() => setEditingUser(undefined)} onSave={loadUsers} />
      )}
      {deletingUser && (
        <DeleteConfirm user={deletingUser} onCancel={() => setDeletingUser(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
}
