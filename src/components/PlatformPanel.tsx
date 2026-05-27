"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import {
  ArrowLeft, Shield, BarChart3, Building2, Users, FolderOpen,
  Calendar, ChevronDown, ChevronUp, Loader2, Search, Check,
  AlertTriangle, Pause, Play, Trash2, Edit2, X, Globe,
  Crown, Activity, RefreshCw, CheckCircle2, XCircle, Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan   = 'trial' | 'starter' | 'pro' | 'enterprise';
type Status = 'trial' | 'active' | 'paused' | 'canceled';

interface OrgRow {
  id: string;
  name: string;
  plan: Plan;
  subscription_status: Status;
  trial_ends_at: string | null;
  paused_at: string | null;
  paused_reason: string | null;
  platform_notes: string | null;
  created_at: string;
  memberCount: number;
  projectCount: number;
  ownerEmails: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtRelative = (s?: string | null) => {
  if (!s) return '—';
  const diff = Date.now() - new Date(s).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const PLAN_STYLES: Record<Plan, string> = {
  trial:      'bg-slate-100 text-slate-600 ring-slate-200',
  starter:    'bg-blue-50 text-blue-700 ring-blue-200',
  pro:        'bg-violet-50 text-violet-700 ring-violet-200',
  enterprise: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const STATUS_STYLES: Record<Status, string> = {
  trial:    'bg-amber-50 text-amber-700 ring-amber-200',
  active:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  paused:   'bg-red-50 text-red-700 ring-red-200',
  canceled: 'bg-slate-100 text-slate-500 ring-slate-200',
};

const STATUS_ICONS: Record<Status, any> = {
  trial:    Clock,
  active:   CheckCircle2,
  paused:   Pause,
  canceled: XCircle,
};

// ─── Small components ─────────────────────────────────────────────────────────

function PlatformStatCard({
  label, value, sub, icon: Icon, color = 'blue',
}: { label: string; value: number | string; sub?: string; icon: any; color?: string }) {
  const colors: Record<string, string> = {
    blue:    'bg-blue-50 border-blue-200 text-blue-700',
    violet:  'bg-violet-50 border-violet-200 text-violet-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    red:     'bg-red-50 border-red-200 text-red-700',
    slate:   'bg-slate-100 border-slate-200 text-slate-600',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</p>
        <Icon className="w-4 h-4 opacity-50" />
      </div>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ring-1 ${PLAN_STYLES[plan]}`}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ring-1 ${STATUS_STYLES[status]}`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Overview Section ─────────────────────────────────────────────────────────

function OverviewSection({ orgs }: { orgs: OrgRow[] }) {
  const totalMembers  = orgs.reduce((s, o) => s + o.memberCount, 0);
  const totalProjects = orgs.reduce((s, o) => s + o.projectCount, 0);
  const activeCount   = orgs.filter(o => o.subscription_status === 'active').length;
  const trialCount    = orgs.filter(o => o.subscription_status === 'trial').length;
  const pausedCount   = orgs.filter(o => o.subscription_status === 'paused').length;
  const canceledCount = orgs.filter(o => o.subscription_status === 'canceled').length;

  const recent = [...orgs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 8);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Platform Overview</h2>
        <p className="text-sm text-slate-500">All organisations across the platform.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PlatformStatCard label="Total Orgs"      value={orgs.length}   icon={Building2}  color="blue"    sub="all registered" />
        <PlatformStatCard label="Total Members"   value={totalMembers}  icon={Users}      color="violet"  sub="across all orgs" />
        <PlatformStatCard label="Total Projects"  value={totalProjects} icon={FolderOpen} color="emerald" sub="across all orgs" />
        <PlatformStatCard label="Active"          value={activeCount}   icon={Activity}   color="emerald" sub="paying customers" />
      </div>

      {/* Subscription breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PlatformStatCard label="Trial"    value={trialCount}    icon={Clock}        color="amber"   sub="in trial period" />
        <PlatformStatCard label="Active"   value={activeCount}   icon={CheckCircle2} color="emerald" sub="subscribed" />
        <PlatformStatCard label="Paused"   value={pausedCount}   icon={Pause}        color="red"     sub="access suspended" />
        <PlatformStatCard label="Canceled" value={canceledCount} icon={XCircle}      color="slate"   sub="churned" />
      </div>

      {/* Recent registrations */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">Recent Registrations</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {recent.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10">No organisations yet</p>
          ) : recent.map(org => (
            <div key={org.id} className="px-6 py-3.5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{org.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {org.ownerEmails[0] || 'No owner'} · {org.memberCount} member{org.memberCount !== 1 ? 's' : ''} · {org.projectCount} project{org.projectCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <PlanBadge plan={org.plan} />
                <StatusBadge status={org.subscription_status} />
                <span className="text-xs text-slate-400 ml-2">{fmtRelative(org.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Edit Drawer (inline row expansion) ──────────────────────────────────────

function OrgEditDrawer({
  org,
  onSave,
  onDelete,
  onClose,
}: {
  org: OrgRow;
  onSave: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState<Plan>(org.plan);
  const [status, setStatus] = useState<Status>(org.subscription_status);
  const [pauseReason, setPauseReason] = useState(org.paused_reason || '');
  const [notes, setNotes] = useState(org.platform_notes || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await onSave(org.id, {
        plan,
        subscription_status: status,
        paused_reason: status === 'paused' ? pauseReason : undefined,
        platform_notes: notes,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    const confirmed = prompt(`Type the org name "${org.name}" to permanently delete it and ALL its data:`);
    if (confirmed !== org.name) return;
    setDeleting(true); setError('');
    try {
      await onDelete(org.id);
    } catch (e: any) {
      setError(e.message || 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <tr>
      <td colSpan={7} className="bg-slate-50 border-b border-slate-200 px-0">
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-slate-500" /> Edit: {org.name}
            </h4>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Plan */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Plan</label>
              <select
                value={plan}
                onChange={e => setPlan(e.target.value as Plan)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Status)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>

            {/* Pause reason — only shown when paused */}
            {status === 'paused' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Pause Reason</label>
                <input
                  value={pauseReason}
                  onChange={e => setPauseReason(e.target.value)}
                  placeholder="e.g. Payment overdue"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Platform notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Internal Notes <span className="normal-case font-normal text-slate-400">(only you can see this)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Contract details, support notes, onboarding status…"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete Org & All Data
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-white transition">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Organisations Section ────────────────────────────────────────────────────

function OrgsSection({
  orgs,
  loading,
  onRefresh,
}: {
  orgs: OrgRow[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = orgs.filter(org => {
    const matchStatus = statusFilter === 'all' || org.subscription_status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      org.name.toLowerCase().includes(q) ||
      org.ownerEmails.some(e => e.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  const handleSave = async (id: string, updates: any) => {
    const res = await apiFetch(`/api/platform/orgs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save');
    setExpandedId(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    const res = await apiFetch(`/api/platform/orgs/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete');
    setExpandedId(null);
    onRefresh();
  };

  const handleQuickToggle = async (org: OrgRow) => {
    const newStatus: Status = org.subscription_status === 'paused' ? 'active' : 'paused';
    setSaving(true);
    try {
      await handleSave(org.id, {
        subscription_status: newStatus,
        paused_reason: newStatus === 'paused' ? 'Paused by platform admin' : undefined,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Organisations</h2>
          <p className="text-sm text-slate-500 mt-0.5">{orgs.length} registered organisation{orgs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium transition"
        >
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
            placeholder="Search org name or owner email…"
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 w-72"
          />
        </div>
        {(['all', 'trial', 'active', 'paused', 'canceled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Organisation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Owner</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Members</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Projects</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                    No organisations match your filter
                  </td>
                </tr>
              ) : filtered.map(org => (
                <>
                  <tr
                    key={org.id}
                    className={`hover:bg-slate-50 transition ${expandedId === org.id ? 'bg-blue-50/40' : ''}`}
                  >
                    {/* Org name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{org.name}</p>
                          <p className="text-xs text-slate-400">Registered {fmtDate(org.created_at)}</p>
                          {org.platform_notes && (
                            <p className="text-xs text-amber-600 mt-0.5 truncate max-w-[180px]">📝 {org.platform_notes}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-3.5">
                      {org.ownerEmails.length === 0 ? (
                        <span className="text-slate-400 text-xs">No owner</span>
                      ) : (
                        <div>
                          <p className="text-sm text-slate-700 truncate max-w-[160px]">{org.ownerEmails[0]}</p>
                          {org.ownerEmails.length > 1 && (
                            <p className="text-xs text-slate-400">+{org.ownerEmails.length - 1} more</p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3.5 text-center">
                      <PlanBadge plan={org.plan} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      <div>
                        <StatusBadge status={org.subscription_status} />
                        {org.subscription_status === 'paused' && org.paused_reason && (
                          <p className="text-xs text-red-500 mt-0.5 truncate max-w-[100px]">{org.paused_reason}</p>
                        )}
                        {org.subscription_status === 'trial' && org.trial_ends_at && (
                          <p className="text-xs text-amber-500 mt-0.5">Ends {fmtDate(org.trial_ends_at)}</p>
                        )}
                      </div>
                    </td>

                    {/* Members */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-sm font-semibold text-slate-700">{org.memberCount}</span>
                    </td>

                    {/* Projects */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-sm font-semibold text-slate-700">{org.projectCount}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick pause/resume */}
                        {(org.subscription_status === 'active' || org.subscription_status === 'paused') && (
                          <button
                            onClick={() => handleQuickToggle(org)}
                            disabled={saving}
                            title={org.subscription_status === 'paused' ? 'Resume access' : 'Pause access'}
                            className={`p-1.5 rounded-lg transition text-xs ${
                              org.subscription_status === 'paused'
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            }`}
                          >
                            {org.subscription_status === 'paused'
                              ? <Play className="w-4 h-4" />
                              : <Pause className="w-4 h-4" />
                            }
                          </button>
                        )}
                        {/* Expand/collapse edit drawer */}
                        <button
                          onClick={() => setExpandedId(expandedId === org.id ? null : org.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          {expandedId === org.id
                            ? <ChevronUp className="w-4 h-4" />
                            : <ChevronDown className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit drawer */}
                  {expandedId === org.id && (
                    <OrgEditDrawer
                      key={`drawer-${org.id}`}
                      org={org}
                      onSave={handleSave}
                      onDelete={handleDelete}
                      onClose={() => setExpandedId(null)}
                    />
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Main PlatformPanel ───────────────────────────────────────────────────────

type PlatformTab = 'overview' | 'orgs';

const NAV: { id: PlatformTab; icon: any; label: string }[] = [
  { id: 'overview', icon: BarChart3,  label: 'Overview' },
  { id: 'orgs',     icon: Building2,  label: 'Organisations' },
];

export default function PlatformPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<PlatformTab>('overview');
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/platform/orgs').then(r => r.json());
      setOrgs(Array.isArray(data) ? data : []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

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
          <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-900">Platform Control</span>
            <span className="text-xs text-slate-400 ml-2">Super Admin</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2.5 py-1 rounded-full font-medium">
            🔑 Platform Admin — handle with care
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 p-4 flex-shrink-0 sticky top-[61px] self-start h-[calc(100vh-61px)]">
          <nav className="space-y-1">
            {NAV.map(n => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === n.id
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <n.icon className="w-4 h-4 flex-shrink-0" />
                {n.label}
              </button>
            ))}
          </nav>

          {/* Quick stats in sidebar */}
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Quick Stats</p>
            <div className="space-y-2">
              {[
                { label: 'Total Orgs',    value: orgs.length },
                { label: 'Active',        value: orgs.filter(o => o.subscription_status === 'active').length },
                { label: 'Trial',         value: orgs.filter(o => o.subscription_status === 'trial').length },
                { label: 'Paused',        value: orgs.filter(o => o.subscription_status === 'paused').length },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          {tab === 'overview' && <OverviewSection orgs={orgs} />}
          {tab === 'orgs'     && <OrgsSection orgs={orgs} loading={loading} onRefresh={loadOrgs} />}
        </main>
      </div>
    </div>
  );
}
