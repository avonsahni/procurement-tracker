"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import {
  ArrowLeft, Shield, BarChart3, Building2, Users, FolderOpen,
  Calendar, ChevronDown, ChevronUp, Loader2, Search, Check,
  AlertTriangle, Pause, Play, Trash2, Edit2, X, Globe,
  Crown, Activity, RefreshCw, CheckCircle2, XCircle, Clock,
  Bug, Terminal, Smartphone, Tag, Percent, Gift,
  ToggleLeft, ToggleRight, IndianRupee, Plus, Mail, ExternalLink,
  MessageSquare, Phone, Building, Inbox, Circle, Eye, EyeOff,
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
  onViewDetails,
}: {
  orgs: OrgRow[];
  loading: boolean;
  onRefresh: () => void;
  onViewDetails: (id: string) => void;
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
                          <button
                            onClick={() => onViewDetails(org.id)}
                            className="font-medium text-slate-900 hover:text-blue-600 transition text-left"
                          >
                            {org.name}
                          </button>
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
                        {/* View details */}
                        <button
                          onClick={() => onViewDetails(org.id)}
                          title="View details & manage users"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition text-xs font-medium"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View
                        </button>
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
                          title="Quick edit"
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

// ─── Error Log Section ────────────────────────────────────────────────────────

interface ErrorEntry {
  id: string;
  created_at: string;
  level: 'error' | 'warn' | 'info';
  source: 'server' | 'client' | 'api';
  route: string | null;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  user_id: string | null;
  org_id: string | null;
}

const LEVEL_STYLES = {
  error: 'bg-red-50 text-red-700 ring-red-200',
  warn:  'bg-amber-50 text-amber-700 ring-amber-200',
  info:  'bg-blue-50 text-blue-700 ring-blue-200',
};

const SOURCE_ICONS: Record<string, any> = {
  server: Terminal,
  api:    Terminal,
  client: Smartphone,
};

function ErrorLogSection() {
  const [entries, setEntries] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/platform/errors');
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter(e => filter === 'all' || e.level === filter);

  const errorCount = entries.filter(e => e.level === 'error').length;
  const warnCount  = entries.filter(e => e.level === 'warn').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Error Log</h2>
          <p className="text-sm text-slate-500 mt-0.5">Last 200 application errors from server and client</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'all',   label: `All (${entries.length})` },
          { id: 'error', label: `Errors (${errorCount})` },
          { id: 'warn',  label: `Warnings (${warnCount})` },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id as any)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition ${
              filter === id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bug className="w-8 h-8 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No errors logged</p>
          <p className="text-slate-400 text-sm mt-1">
            {filter === 'all' ? 'The error log is empty.' : `No ${filter}-level entries.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => {
            const Icon = SOURCE_ICONS[entry.source] ?? Terminal;
            const isOpen = expanded === entry.id;
            return (
              <div key={entry.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Header row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : entry.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ring-1 uppercase tracking-wide flex-shrink-0 ${LEVEL_STYLES[entry.level]}`}>
                    {entry.level}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="flex-1 text-sm text-slate-700 font-medium truncate">{entry.message}</span>
                  {entry.route && (
                    <span className="text-[11px] font-mono text-slate-400 hidden sm:block flex-shrink-0 max-w-[160px] truncate">
                      {entry.route}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 flex-shrink-0">{fmtRelative(entry.created_at)}</span>
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-100 space-y-3 pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400 mb-0.5">Source</p>
                        <p className="font-medium text-slate-700 capitalize">{entry.source}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Route</p>
                        <p className="font-mono text-slate-700 truncate">{entry.route ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Time</p>
                        <p className="font-medium text-slate-700">{new Date(entry.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">User ID</p>
                        <p className="font-mono text-slate-700 truncate">{entry.user_id ?? '—'}</p>
                      </div>
                    </div>

                    {entry.stack && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Stack trace</p>
                        <pre className="text-[11px] font-mono bg-slate-950 text-slate-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                          {entry.stack}
                        </pre>
                      </div>
                    )}

                    {entry.context && Object.keys(entry.context).length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Context</p>
                        <pre className="text-[11px] font-mono bg-slate-50 text-slate-700 rounded-lg p-3 overflow-x-auto">
                          {JSON.stringify(entry.context, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Plans & Coupons Section ──────────────────────────────────────────────────

function PlansSection() {
  type PricingRow = { tier: string; price_inr: number; period: string; description: string | null; updated_by: string | null; updated_at: string };
  type CouponRow  = { id: string; code: string; type: 'free' | 'discount'; discount_pct: number | null; free_plan: string | null; valid_days: number; max_uses: number | null; used_count: number; is_active: boolean; expires_at: string | null; notes: string | null };

  const [pricing, setPricing]           = useState<PricingRow[]>([]);
  const [editTier, setEditTier]         = useState<string | null>(null);
  const [editForm, setEditForm]         = useState({ price_inr: 0, period: 'month', description: '' });
  const [savingPrice, setSavingPrice]   = useState(false);
  const [priceMsg, setPriceMsg]         = useState('');

  const [coupons, setCoupons]           = useState<CouponRow[]>([]);
  const [loadingData, setLoadingData]   = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm]     = useState({
    code: '', type: 'free' as 'free' | 'discount',
    free_plan: 'starter' as 'starter' | 'pro' | 'enterprise',
    discount_pct: 10, valid_days: 30, max_uses: '', expires_at: '', notes: '',
  });
  const [couponError, setCouponError]   = useState('');
  const [savingCoupon, setSavingCoupon] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const [pRes, cRes] = await Promise.all([
        apiFetch('/api/platform/pricing').then(r => r.json()),
        apiFetch('/api/platform/coupons').then(r => r.json()),
      ]);
      if (Array.isArray(pRes)) setPricing(pRes);
      if (Array.isArray(cRes)) setCoupons(cRes);
    } catch { /* silent */ } finally { setLoadingData(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const startEditPrice = (p: PricingRow) => {
    setEditTier(p.tier);
    setEditForm({ price_inr: p.price_inr, period: p.period, description: p.description ?? '' });
    setPriceMsg('');
  };

  const savePrice = async (tier: string) => {
    setSavingPrice(true); setPriceMsg('');
    try {
      const res = await apiFetch('/api/platform/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, ...editForm, price_inr: Number(editForm.price_inr) }),
      });
      const body = await res.json();
      if (!res.ok) { setPriceMsg(body.error || 'Save failed'); return; }
      setPricing(prev => prev.map(p => p.tier === tier ? body : p));
      setEditTier(null);
      setPriceMsg('Saved!');
      setTimeout(() => setPriceMsg(''), 2500);
    } catch { setPriceMsg('Network error'); }
    finally { setSavingPrice(false); }
  };

  const createCoupon = async () => {
    setCouponError('');
    if (!couponForm.code.trim()) { setCouponError('Code is required'); return; }
    if (couponForm.valid_days < 1) { setCouponError('Valid days must be ≥ 1'); return; }
    setSavingCoupon(true);
    try {
      const payload: Record<string, unknown> = {
        code: couponForm.code.trim().toUpperCase(),
        type: couponForm.type,
        valid_days: Number(couponForm.valid_days),
        max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : null,
        expires_at: couponForm.expires_at ? new Date(couponForm.expires_at).toISOString() : null,
        notes: couponForm.notes || null,
      };
      if (couponForm.type === 'free') payload.free_plan = couponForm.free_plan;
      else payload.discount_pct = Number(couponForm.discount_pct);
      const res = await apiFetch('/api/platform/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) { setCouponError(body.error || 'Create failed'); return; }
      setCoupons(prev => [body, ...prev]);
      setCouponForm({ code: '', type: 'free', free_plan: 'starter', discount_pct: 10, valid_days: 30, max_uses: '', expires_at: '', notes: '' });
      setShowCouponForm(false);
    } catch { setCouponError('Network error'); }
    finally { setSavingCoupon(false); }
  };

  const toggleCoupon = async (c: CouponRow) => {
    try {
      const res = await apiFetch(`/api/platform/coupons/${encodeURIComponent(c.code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      const body = await res.json();
      if (res.ok) setCoupons(prev => prev.map(x => x.id === c.id ? body : x));
    } catch { /* silent */ }
  };

  const deleteCoupon = async (c: CouponRow) => {
    if (!confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/platform/coupons/${encodeURIComponent(c.code)}`, { method: 'DELETE' });
      setCoupons(prev => prev.filter(x => x.id !== c.id));
    } catch { /* silent */ }
  };

  const TIER_LABELS: Record<string, string> = { trial: 'Trial', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
  const TIER_BG: Record<string, string> = {
    trial: 'bg-slate-50 border-slate-200', starter: 'bg-blue-50 border-blue-200',
    pro: 'bg-violet-50 border-violet-200', enterprise: 'bg-amber-50 border-amber-200',
  };
  const TIER_TEXT: Record<string, string> = {
    trial: 'text-slate-700', starter: 'text-blue-800', pro: 'text-violet-800', enterprise: 'text-amber-800',
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Plans & Pricing</h2>
        <p className="text-sm text-slate-500">Set per-tier pricing in ₹ and manage promotional coupons.</p>
      </div>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-600" /> Plan Pricing
          </h3>
          {priceMsg && (
            <span className={`text-xs font-semibold ${priceMsg === 'Saved!' ? 'text-emerald-600' : 'text-red-500'}`}>
              {priceMsg}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loadingData && pricing.length === 0
            ? [1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />)
            : pricing.map(p => (
              <div key={p.tier} className={`rounded-xl border p-5 ${TIER_BG[p.tier] ?? 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-start justify-between mb-2">
                  <p className={`text-xs font-bold uppercase tracking-widest ${TIER_TEXT[p.tier]}`}>
                    {TIER_LABELS[p.tier] ?? p.tier}
                  </p>
                  {editTier !== p.tier ? (
                    <button onClick={() => startEditPrice(p)}
                      className="text-xs text-slate-500 border border-slate-300 bg-white px-2.5 py-1 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5">
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  ) : (
                    <div className="flex gap-1.5">
                      <button onClick={() => savePrice(p.tier)} disabled={savingPrice}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1">
                        {savingPrice ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                      </button>
                      <button onClick={() => setEditTier(null)}
                        className="text-xs border border-slate-200 bg-white px-2 py-1 rounded-lg hover:bg-slate-50 transition">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {editTier !== p.tier ? (
                  <>
                    <p className={`text-2xl font-extrabold ${TIER_TEXT[p.tier]}`}>
                      {Number(p.price_inr) === 0 ? 'Free' : `₹${Number(p.price_inr).toLocaleString('en-US')}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">per {p.period}</p>
                    {p.description && <p className="text-xs text-slate-400 mt-1">{p.description}</p>}
                    {p.updated_by && (
                      <p className="text-[10px] text-slate-400 mt-2">Updated by {p.updated_by} · {fmtDate(p.updated_at)}</p>
                    )}
                  </>
                ) : (
                  <div className="space-y-2.5 mt-1">
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium block mb-1">Price (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
                        <input type="number" min="0" step="1"
                          value={editForm.price_inr}
                          onChange={e => setEditForm(f => ({ ...f, price_inr: Number(e.target.value) }))}
                          className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium block mb-1">Period</label>
                      <select value={editForm.period}
                        onChange={e => setEditForm(f => ({ ...f, period: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                        {['14 days','month','3 months','6 months','year'].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium block mb-1">Description</label>
                      <input value={editForm.description}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="e.g. Up to 10 team members"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
          ))}
        </div>
      </div>

      {/* ── Coupons ──────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" /> Promotional Coupons
          </h3>
          <button onClick={() => { setShowCouponForm(v => !v); setCouponError(''); }}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-3.5 h-3.5" /> New Coupon
          </button>
        </div>

        {showCouponForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                <Gift className="w-4 h-4" /> Create Coupon
              </h4>
              <button onClick={() => setShowCouponForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {couponError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{couponError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">Code *</label>
                <input value={couponForm.code}
                  onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="LAUNCH50"
                  className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-mono tracking-wider"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">Type *</label>
                <div className="flex gap-2 mt-1">
                  {(['free','discount'] as const).map(t => (
                    <label key={t} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition ${
                      couponForm.type === t ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-200 text-slate-600 hover:bg-blue-50'
                    }`}>
                      <input type="radio" name="coupon-type" value={t} checked={couponForm.type === t}
                        onChange={() => setCouponForm(f => ({ ...f, type: t }))} className="hidden" />
                      {t === 'free' ? <Gift className="w-3 h-3" /> : <Percent className="w-3 h-3" />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              {couponForm.type === 'free' ? (
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">Free Plan *</label>
                  <select value={couponForm.free_plan}
                    onChange={e => setCouponForm(f => ({ ...f, free_plan: e.target.value as 'starter' | 'pro' | 'enterprise' }))}
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">Discount % *</label>
                  <input type="number" min="1" max="100"
                    value={couponForm.discount_pct}
                    onChange={e => setCouponForm(f => ({ ...f, discount_pct: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  />
                </div>
              )}
              <div>
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">Valid Days *</label>
                <input type="number" min="1"
                  value={couponForm.valid_days}
                  onChange={e => setCouponForm(f => ({ ...f, valid_days: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                  Max Uses <span className="text-slate-400 font-normal">(blank = unlimited)</span>
                </label>
                <input type="number" min="1"
                  value={couponForm.max_uses}
                  onChange={e => setCouponForm(f => ({ ...f, max_uses: e.target.value }))}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                  Expires <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input type="date"
                  value={couponForm.expires_at}
                  onChange={e => setCouponForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                Notes <span className="text-slate-400 font-normal">(internal only)</span>
              </label>
              <input value={couponForm.notes}
                onChange={e => setCouponForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Launch promotion Q1 2026"
                className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={createCoupon} disabled={savingCoupon}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {savingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {savingCoupon ? 'Creating…' : 'Create Coupon'}
              </button>
              <button onClick={() => setShowCouponForm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-white transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {coupons.length === 0 && !loadingData ? (
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-10 text-center text-slate-400 text-sm">
            No coupons yet. Create your first promotional coupon above.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Benefit</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Uses</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Expires</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map(c => {
                  const benefit = c.type === 'free'
                    ? `${c.free_plan ? c.free_plan.charAt(0).toUpperCase() + c.free_plan.slice(1) : '?'} free / ${c.valid_days}d`
                    : `${c.discount_pct}% off / ${c.valid_days}d`;
                  const expired   = !!c.expires_at && new Date(c.expires_at) < new Date();
                  const exhausted = c.max_uses !== null && c.used_count >= c.max_uses;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-800 text-xs tracking-wider">{c.code}</span>
                        {c.notes && <p className="text-[10px] text-slate-400 mt-0.5">{c.notes}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${
                          c.type === 'free'
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-blue-50 text-blue-700 ring-blue-200'
                        }`}>
                          {c.type === 'free' ? <Gift className="w-3 h-3" /> : <Percent className="w-3 h-3" />}
                          {benefit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold ${exhausted ? 'text-red-600' : 'text-slate-700'}`}>
                          {c.used_count}{c.max_uses !== null ? ` / ${c.max_uses}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs ${expired ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                          {c.expires_at ? fmtDate(c.expires_at) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ring-1 ${
                          !c.is_active     ? 'bg-slate-100 text-slate-500 ring-slate-200' :
                          expired || exhausted ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                          'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        }`}>
                          {!c.is_active ? 'Inactive' : expired ? 'Expired' : exhausted ? 'Exhausted' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleCoupon(c)}
                            title={c.is_active ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-lg transition ${c.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                            {c.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => deleteCoupon(c)} title="Delete"
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Org Detail View ──────────────────────────────────────────────────────────

type OrgMember = {
  id: string;
  email: string;
  fullName: string;
  role: 'owner' | 'admin' | 'viewer';
  joinedAt: string;
};

const ROLE_STYLES: Record<string, string> = {
  owner:  'bg-orange-50 text-orange-700 ring-orange-200',
  admin:  'bg-violet-50 text-violet-700 ring-violet-200',
  viewer: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function OrgDetailView({
  orgId,
  orgs,
  onBack,
  onOrgUpdated,
}: {
  orgId: string;
  orgs: OrgRow[];
  onBack: () => void;
  onOrgUpdated: () => void;
}) {
  type DetailTab = 'users' | 'settings';
  const [detailTab, setDetailTab] = useState<DetailTab>('users');

  // Org data (from already-loaded list, enriched by individual GET if needed)
  const org = orgs.find(o => o.id === orgId);

  // ── Users state ──
  const [members, setMembers]     = useState<OrgMember[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError]     = useState('');

  // Role change
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  // Remove user
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  // Add user form
  const [addEmail, setAddEmail]     = useState('');
  const [addRole, setAddRole]       = useState<'owner' | 'admin' | 'viewer'>('viewer');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // ── Settings state ──
  const [plan, setPlan]             = useState<Plan>(org?.plan ?? 'trial');
  const [status, setStatus]         = useState<Status>(org?.subscription_status ?? 'trial');
  const [pauseReason, setPauseReason] = useState(org?.paused_reason || '');
  const [notes, setNotes]           = useState(org?.platform_notes || '');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg]       = useState('');

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true); setUsersError('');
    try {
      const res = await apiFetch(`/api/platform/orgs/${orgId}/users`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setMembers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setUsersError(e.message || 'Failed to load users');
    } finally { setLoadingUsers(false); }
  }, [orgId]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setRoleLoading(userId);
    try {
      const res = await apiFetch(`/api/platform/orgs/${orgId}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole as OrgMember['role'] } : m));
    } catch (e: any) {
      alert(e.message);
    } finally { setRoleLoading(null); }
  };

  const handleRemove = async (userId: string, email: string) => {
    if (!confirm(`Remove ${email} from this organisation?`)) return;
    setRemoveLoading(userId);
    try {
      const res = await apiFetch(`/api/platform/orgs/${orgId}/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove user');
      setMembers(prev => prev.filter(m => m.id !== userId));
    } catch (e: any) {
      alert(e.message);
    } finally { setRemoveLoading(null); }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(''); setAddSuccess(''); setAddLoading(true);
    try {
      const res = await apiFetch(`/api/platform/orgs/${orgId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail.trim(), role: addRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add user');
      setMembers(prev => [...prev, data]);
      setAddSuccess(`${data.email} added as ${data.role}.`);
      setAddEmail('');
      setAddRole('viewer');
    } catch (e: any) {
      setAddError(e.message || 'Failed to add user');
    } finally { setAddLoading(false); }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true); setSettingsMsg('');
    try {
      const res = await apiFetch(`/api/platform/orgs/${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          subscription_status: status,
          paused_reason: status === 'paused' ? pauseReason : undefined,
          platform_notes: notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSettingsMsg('Saved!');
      onOrgUpdated();
    } catch (e: any) {
      setSettingsMsg(e.message || 'Save failed');
    } finally {
      setSettingsSaving(false);
      setTimeout(() => setSettingsMsg(''), 3000);
    }
  };

  if (!org) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Organisation not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Organisations
        </button>
        <span className="text-slate-300">/</span>
        <h2 className="text-lg font-semibold text-slate-900">{org.name}</h2>
        <PlanBadge plan={org.plan} />
        <StatusBadge status={org.subscription_status} />
      </div>

      {/* Quick info row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <PlatformStatCard label="Members"  value={org.memberCount}  icon={Users}      color="violet" />
        <PlatformStatCard label="Projects" value={org.projectCount} icon={FolderOpen} color="emerald" />
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1 text-slate-600">Owner(s)</p>
          {org.ownerEmails.length === 0
            ? <p className="text-sm text-slate-400">None</p>
            : org.ownerEmails.map(e => <p key={e} className="text-sm font-semibold text-slate-800 truncate">{e}</p>)
          }
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1 text-slate-600">Registered</p>
          <p className="text-sm font-semibold text-slate-800">{fmtDate(org.created_at)}</p>
          {org.platform_notes && (
            <p className="text-xs text-amber-600 mt-1 truncate">📝 {org.platform_notes}</p>
          )}
        </div>
      </div>

      {/* Sub-tab nav */}
      <div className="flex gap-1 border-b border-slate-200">
        {([
          { id: 'users' as const, label: 'Users', icon: Users },
          { id: 'settings' as const, label: 'Settings', icon: Edit2 },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setDetailTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              detailTab === t.id
                ? 'border-orange-500 text-orange-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.id === 'users' && (
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">
                {members.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {detailTab === 'users' && (
        <div className="space-y-5">
          {usersError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{usersError}</p>
          )}

          {/* Members table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Current Members</p>
              {loadingUsers && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
            {loadingUsers ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">No members yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map(member => (
                    <tr key={member.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-600">
                            {(member.fullName || member.email)[0]?.toUpperCase()}
                          </div>
                          <div>
                            {member.fullName && <p className="font-medium text-slate-900 text-sm">{member.fullName}</p>}
                            <p className={`text-slate-500 ${member.fullName ? 'text-xs' : 'text-sm font-medium text-slate-900'}`}>{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <select
                          value={member.role}
                          disabled={roleLoading === member.id}
                          onChange={e => handleRoleChange(member.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-lg border cursor-pointer outline-none transition ${ROLE_STYLES[member.role]} ${roleLoading === member.id ? 'opacity-50' : ''}`}
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        {roleLoading === member.id && <Loader2 className="w-3 h-3 animate-spin text-slate-400 inline ml-1" />}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-xs text-slate-500">{fmtDate(member.joinedAt)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleRemove(member.id, member.email)}
                          disabled={removeLoading === member.id}
                          title="Remove from org"
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        >
                          {removeLoading === member.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />
                          }
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add user form */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-blue-600" /> Add User to Organisation
            </h4>
            {addError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{addError}</p>
            )}
            {addSuccess && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> {addSuccess}
              </p>
            )}
            <form onSubmit={handleAddUser} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="email"
                    value={addEmail}
                    onChange={e => { setAddEmail(e.target.value); setAddError(''); setAddSuccess(''); }}
                    placeholder="user@company.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Role</label>
                <select
                  value={addRole}
                  onChange={e => setAddRole(e.target.value as OrgMember['role'])}
                  className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={addLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {addLoading ? 'Adding…' : 'Add User'}
              </button>
            </form>
            <p className="text-xs text-slate-400 mt-3">
              The user must already have an account. To invite a new user, have them register first.
            </p>
          </div>
        </div>
      )}

      {/* ── Settings tab ── */}
      {detailTab === 'settings' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-2xl">
          <h3 className="text-sm font-semibold text-slate-800">Organisation Settings</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Plan</label>
              <select
                value={plan}
                onChange={e => setPlan(e.target.value as Plan)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Status)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>

            {status === 'paused' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Pause Reason</label>
                <input
                  value={pauseReason}
                  onChange={e => setPauseReason(e.target.value)}
                  placeholder="e.g. Payment overdue"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Internal Notes <span className="normal-case font-normal text-slate-400">(only visible to platform admins)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Contract details, support notes, onboarding status…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSaveSettings}
              disabled={settingsSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {settingsSaving ? 'Saving…' : 'Save Changes'}
            </button>
            {settingsMsg && (
              <span className={`text-sm font-medium ${settingsMsg === 'Saved!' ? 'text-emerald-600' : 'text-red-600'}`}>
                {settingsMsg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Messages Section ─────────────────────────────────────────────────────────

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

function MessagesSection() {
  const [messages, setMessages]     = useState<ContactMessage[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter]         = useState<'all' | 'unread' | 'read'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch('/api/platform/messages');
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string, is_read: boolean) => {
    try {
      await apiFetch(`/api/platform/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read }),
      });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read } : m));
    } catch { /* silent */ }
  };

  const deleteMsg = async (id: string) => {
    if (!confirm('Delete this message permanently?')) return;
    try {
      await apiFetch(`/api/platform/messages/${id}`, { method: 'DELETE' });
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch { /* silent */ }
  };

  const handleSelect = (msg: ContactMessage) => {
    setSelectedId(msg.id === selectedId ? null : msg.id);
    if (!msg.is_read) markRead(msg.id, true);
  };

  const filtered = messages.filter(m =>
    filter === 'all'    ? true :
    filter === 'unread' ? !m.is_read :
    m.is_read
  );

  const unreadCount = messages.filter(m => !m.is_read).length;
  const selected    = messages.find(m => m.id === selectedId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            Contact Messages
            {unreadCount > 0 && (
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                {unreadCount} new
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Enquiries submitted via the landing page contact form
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {(['all', 'unread', 'read'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f === 'all' ? `All (${messages.length})` :
             f === 'unread' ? `Unread (${unreadCount})` :
             `Read (${messages.length - unreadCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-200 rounded-xl">
          <Inbox className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">No messages yet</p>
          <p className="text-slate-400 text-sm mt-1">
            {filter === 'all'
              ? 'When visitors submit the contact form, their messages will appear here.'
              : `No ${filter} messages.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Message list */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filtered.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => handleSelect(msg)}
                  className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition ${
                    selectedId === msg.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread dot */}
                    <div className="flex-shrink-0 mt-1">
                      {!msg.is_read
                        ? <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                        : <div className="w-2 h-2" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className={`text-sm truncate ${!msg.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {msg.name}
                        </p>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{fmtRelative(msg.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{msg.email}</p>
                      {msg.company && <p className="text-xs text-slate-400 truncate">{msg.company}</p>}
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{msg.message}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Message detail */}
          {selected ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{selected.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{fmtDate(selected.created_at)}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => markRead(selected.id, !selected.is_read)}
                    title={selected.is_read ? 'Mark unread' : 'Mark read'}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    {selected.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteMsg(selected.id)}
                    title="Delete"
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contact details */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a href={`mailto:${selected.email}`} className="text-blue-600 hover:underline truncate">
                    {selected.email}
                  </a>
                </div>
                {selected.phone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <a href={`tel:${selected.phone}`} className="text-slate-700 hover:text-blue-600 transition">
                      {selected.phone}
                    </a>
                  </div>
                )}
                {selected.company && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Building className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-700">{selected.company}</span>
                  </div>
                )}
              </div>

              {/* Message body */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Message</p>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              </div>

              {/* Quick reply link */}
              <a
                href={`mailto:${selected.email}?subject=Re: Your enquiry about ProcureTrack`}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                <Mail className="w-4 h-4" /> Reply via Email
              </a>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-sm text-slate-400">Select a message to read it</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main PlatformPanel ───────────────────────────────────────────────────────

type PlatformTab = 'overview' | 'orgs' | 'plans' | 'errors' | 'messages';

const NAV: { id: PlatformTab; icon: any; label: string }[] = [
  { id: 'overview',  icon: BarChart3,     label: 'Overview' },
  { id: 'orgs',      icon: Building2,     label: 'Organisations' },
  { id: 'plans',     icon: Tag,           label: 'Plans & Coupons' },
  { id: 'errors',    icon: Bug,           label: 'Error Log' },
  { id: 'messages',  icon: MessageSquare, label: 'Messages' },
];

export default function PlatformPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<PlatformTab>('overview');
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Load unread message count for the sidebar badge
  useEffect(() => {
    apiFetch('/api/platform/messages')
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) setUnreadMessageCount(data.filter(m => !m.is_read).length);
      })
      .catch(() => {});
  }, []);

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

  const handleViewOrg = (id: string) => {
    setSelectedOrgId(id);
    setTab('orgs');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={selectedOrgId ? () => setSelectedOrgId(null) : onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          {selectedOrgId ? 'Back to Organisations' : 'Back to Dashboard'}
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
                onClick={() => { setTab(n.id); setSelectedOrgId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === n.id
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <n.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{n.label}</span>
                {n.id === 'messages' && unreadMessageCount > 0 && (
                  <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">
                    {unreadMessageCount}
                  </span>
                )}
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
          {/* Org detail view — overrides tab content when an org is selected */}
          {selectedOrgId ? (
            <OrgDetailView
              orgId={selectedOrgId}
              orgs={orgs}
              onBack={() => setSelectedOrgId(null)}
              onOrgUpdated={loadOrgs}
            />
          ) : (
            <>
              {tab === 'overview'  && <OverviewSection orgs={orgs} />}
              {tab === 'orgs'      && <OrgsSection orgs={orgs} loading={loading} onRefresh={loadOrgs} onViewDetails={handleViewOrg} />}
              {tab === 'plans'     && <PlansSection />}
              {tab === 'errors'    && <ErrorLogSection />}
              {tab === 'messages'  && <MessagesSection />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
