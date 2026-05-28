"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, ArrowRight, BarChart3, FolderOpen, Users,
  Shield, FileText, ChevronRight, Star,
  TrendingUp, Clock, Award, Package, Building2, Zap,
  Activity,
} from "lucide-react";
import { LoginModal } from "@/components/auth/LoginForm";

// ─── Inline UI mockups ────────────────────────────────────────────────────────

function DashboardMockup() {
  const milestones = [
    { name: "Mobilisation",             pct: 7  },
    { name: "Preliminaries",            pct: 7  },
    { name: "Procurement",              pct: 7  },
    { name: "Installation",             pct: 6  },
    { name: "Testing & Commissioning",  pct: 4  },
    { name: "Handover",                 pct: 3  },
  ];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-left select-none text-slate-900">
      {/* App top bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-900 leading-tight">Procurement Tracker</p>
          <p className="text-[9px] text-slate-400 leading-tight">Enterprise Source of Truth</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          {["Analytics", "Edit Mode", "Admin"].map(btn => (
            <span key={btn} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-medium">{btn}</span>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3 bg-slate-50">
        {/* Portfolio Summary card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">Portfolio Summary</p>
          <p className="text-sm font-bold text-slate-900 mb-0.5">Financial Allocation</p>
          <p className="text-[10px] text-slate-400 mb-3">Real-time mapping of capital allocation across all current projects.</p>

          <div className="flex gap-2 mb-3">
            {[
              { label: "Available Capital", value: "₹5,537,991,719", highlight: true },
              { label: "Awarded Rate",      value: "27.2%",          highlight: false },
              { label: "Billed to Date",    value: "₹120,000,000",   highlight: true },
              { label: "Billing Rate",      value: "5.8%",             highlight: false },
              { label: "Milestone Progress",value: "5.3%",             highlight: false },
            ].map(s => (
              <div key={s.label} className="flex-1 min-w-0">
                <p className="text-[8px] text-slate-400 leading-tight truncate">{s.label}</p>
                <p className={`text-[10px] font-bold leading-tight truncate ${s.highlight ? "text-blue-600" : "text-slate-700"}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Mini donut + legend */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="4"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="4"
                  strokeDasharray="6 82" strokeLinecap="round"/>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-slate-600">6%</span>
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              {[
                { dot: "bg-blue-600",    label: "Awarded",   val: "₹2,072,008,281"  },
                { dot: "bg-violet-500",  label: "Billed",    val: "₹120,000,000"    },
                { dot: "bg-slate-300",   label: "Remaining", val: "₹5,537,991,719"  },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.dot}`}/>
                  <span className="text-[8px] text-slate-500 flex-shrink-0">{r.label}</span>
                  <span className="text-[8px] font-semibold text-slate-700 truncate">{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Execution Tracking card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Execution Tracking</p>
          </div>
          <p className="text-sm font-bold text-slate-900 mb-2">Portfolio Milestone Progress</p>

          <div className="flex gap-4 mb-3">
            {[
              { label: "In Execution", value: "76", sub: "packages",       color: "text-emerald-600" },
              { label: "Milestone Avg",value: "5.3%",sub: "all milestones", color: "text-blue-600"   },
              { label: "Financial",    value: "5.8%",sub: "billed/awarded", color: "text-violet-600" },
            ].map(s => (
              <div key={s.label} className="text-right flex-1">
                <p className="text-[8px] text-slate-400">{s.label}</p>
                <p className={`text-base font-extrabold leading-tight ${s.color}`}>{s.value}</p>
                <p className="text-[8px] text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Milestone pipeline */}
          <p className="text-[9px] font-semibold text-slate-600 mb-1.5">Milestone Pipeline</p>
          <div className="space-y-1.5">
            {milestones.map((m, i) => (
              <div key={m.name} className="flex items-center gap-2">
                <span className="text-[8px] text-slate-400 w-3 flex-shrink-0">{i + 1}</span>
                <span className="text-[9px] text-slate-600 w-28 flex-shrink-0 truncate">{m.name}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${m.pct * 10}%` }} />
                </div>
                <span className="text-[9px] font-semibold text-slate-600 w-5 text-right">{m.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StageMockup() {
  const stages = ["Spec Received", "Bid Issued", "Bids Received", "Evaluation", "Awarded"];
  const current = 3;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-5 select-none">
      <p className="text-xs font-semibold text-slate-700 mb-4">Package Lifecycle</p>
      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              i < current ? "bg-emerald-500" : i === current ? "bg-blue-600" : "bg-slate-200"
            }`}>
              {i < current
                ? <CheckCircle2 className="w-3 h-3 text-white" />
                : <div className={`w-1.5 h-1.5 rounded-full ${i === current ? "bg-white" : "bg-slate-400"}`} />
              }
            </div>
            <span className={`text-xs ${i === current ? "font-semibold text-blue-700" : i < current ? "text-emerald-700" : "text-slate-400"}`}>
              {s}
            </span>
            {i === current && (
              <span className="ml-auto text-[9px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full">Current</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-400">3 vendors in evaluation · Decision due 15 Jun</p>
      </div>
    </div>
  );
}

function VendorMockup() {
  const vendors = [
    { name: "BuildCo Ltd",      bid: "£248,000", score: 92, awarded: true  },
    { name: "Apex Contractors", bid: "£261,500", score: 87, awarded: false },
    { name: "Swift Build",      bid: "£239,000", score: 79, awarded: false },
  ];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden select-none">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">Vendor Comparison</span>
        <span className="text-[10px] text-slate-400">3 bids received</span>
      </div>
      <div className="divide-y divide-slate-50">
        {vendors.map(v => (
          <div key={v.name} className={`px-4 py-3 flex items-center gap-3 ${v.awarded ? "bg-emerald-50/60" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{v.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Score: {v.score}/100</p>
            </div>
            <p className="text-xs font-semibold text-slate-800">{v.bid}</p>
            {v.awarded
              ? <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">Awarded</span>
              : <span className="text-[9px] text-slate-300">—</span>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsMockup() {
  const bars = [
    { label: "Metro Rail", pct: 82, color: "bg-blue-500"    },
    { label: "Hospital",   pct: 55, color: "bg-violet-500"  },
    { label: "Bridge",     pct: 91, color: "bg-emerald-500" },
    { label: "School Hub", pct: 34, color: "bg-amber-500"   },
  ];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-5 select-none">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-slate-700">Budget Utilisation</p>
        <span className="text-[10px] text-slate-400">4 projects</span>
      </div>
      <div className="space-y-3">
        {bars.map(b => (
          <div key={b.label}>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-slate-600">{b.label}</span>
              <span className="text-[10px] font-medium text-slate-700">{b.pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
        <div className="text-center">
          <p className="text-base font-bold text-slate-800">£8.9M</p>
          <p className="text-[9px] text-slate-400">Total awarded</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-emerald-600">↓ 12%</p>
          <p className="text-[9px] text-slate-400">Under budget avg</p>
        </div>
      </div>
    </div>
  );
}

function AuditMockup() {
  const entries = [
    { action: "Package awarded",     user: "J. Smith",   time: "2m ago",   color: "bg-emerald-500" },
    { action: "Vendor bid received", user: "A. Khan",    time: "1h ago",   color: "bg-blue-500"    },
    { action: "Document uploaded",   user: "S. Patel",   time: "3h ago",   color: "bg-violet-500"  },
    { action: "Stage updated",       user: "J. Smith",   time: "Yesterday", color: "bg-amber-500"  },
  ];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden select-none">
      <div className="px-4 py-3 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-700">Audit Trail</span>
      </div>
      <div className="divide-y divide-slate-50">
        {entries.map((e, i) => (
          <div key={i} className="px-4 py-2.5 flex items-center gap-3">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${e.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-slate-700 truncate">{e.action}</p>
              <p className="text-[10px] text-slate-400">{e.user}</p>
            </div>
            <span className="text-[10px] text-slate-400 flex-shrink-0">{e.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamMockup() {
  const members = [
    { name: "Jane Smith",  role: "Admin",  badge: "bg-violet-100 text-violet-700", initial: "J" },
    { name: "Amir Khan",   role: "Editor", badge: "bg-blue-100 text-blue-700",     initial: "A" },
    { name: "Sara Patel",  role: "Viewer", badge: "bg-slate-100 text-slate-600",   initial: "S" },
  ];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-5 select-none">
      <p className="text-xs font-semibold text-slate-700 mb-4">Team Members</p>
      <div className="space-y-3">
        {members.map(m => (
          <div key={m.name} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {m.initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800">{m.name}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.badge}`}>{m.role}</span>
          </div>
        ))}
      </div>
      <button className="mt-4 w-full text-[11px] text-blue-600 border border-blue-200 rounded-lg py-2 hover:bg-blue-50 transition font-medium">
        + Invite team member
      </button>
    </div>
  );
}

function ExecutionMockup() {
  const milestones = [
    { name: "Mobilisation",              pct: 100, done: true  },
    { name: "Preliminaries",             pct: 100, done: true  },
    { name: "Procurement",               pct: 85,  done: false },
    { name: "Installation",              pct: 40,  done: false },
    { name: "Testing & Commissioning",   pct: 0,   done: false },
    { name: "Handover",                  pct: 0,   done: false },
  ];
  const overall = Math.round(milestones.reduce((s, m) => s + m.pct, 0) / milestones.length);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden select-none">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-slate-800">Execution Milestones</span>
        </div>
        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
          {overall}% complete
        </span>
      </div>
      {/* Overall bar */}
      <div className="px-5 pt-3 pb-2">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${overall}%` }} />
        </div>
      </div>
      {/* Milestone rows */}
      <div className="px-5 pb-4 space-y-3 mt-1">
        {milestones.map(m => (
          <div key={m.name}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center ${
                  m.done ? "bg-emerald-500" : m.pct > 0 ? "bg-blue-600" : "bg-slate-200"
                }`}>
                  {m.done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className={`text-[11px] font-medium ${m.done ? "text-emerald-700" : m.pct > 0 ? "text-slate-800" : "text-slate-400"}`}>
                  {m.name}
                </span>
              </div>
              <span className={`text-[10px] font-semibold ${m.done ? "text-emerald-600" : m.pct > 0 ? "text-blue-600" : "text-slate-300"}`}>
                {m.pct}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-5">
              <div
                className={`h-full rounded-full ${m.done ? "bg-emerald-500" : "bg-blue-500"}`}
                style={{ width: `${m.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PurchasingMockup() {
  const stages = [
    { name: "Spec Received",          count: 4, color: "bg-slate-400"   },
    { name: "RFQ Float",              count: 3, color: "bg-blue-500"    },
    { name: "Technical Negotiation",  count: 4, color: "bg-violet-500"  },
    { name: "Commercial Negotiation", count: 4, color: "bg-amber-500"   },
    { name: "Award",                  count: 6, color: "bg-emerald-500" },
  ];
  const total   = stages.reduce((s, st) => s + st.count, 0);
  const awarded = 6;
  const awardedPct = Math.round((awarded / total) * 100);

  const pkgs = [
    { name: "Server Racks & Smart PDU Cabinets", cat: "Services",   stage: "Awarded",                stageCls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    { name: "Hot/Cold Aisle Containment Pods",   cat: "Services",   stage: "Awarded",                stageCls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    { name: "UPS & Power Distribution",          cat: "Electrical", stage: "Commercial Negotiation", stageCls: "text-amber-700   bg-amber-50   border-amber-200"   },
    { name: "Structured Cabling Systems",        cat: "Electrical", stage: "Technical Negotiation",  stageCls: "text-violet-700  bg-violet-50  border-violet-200"  },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-left select-none text-slate-900">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Purchasing Dashboard · Tata Communications</p>
        <p className="text-xs font-bold text-slate-800">Hyperion Data Center</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { label: "Total Packages", value: `${total}`,     sub: "",                  color: "text-slate-900"  },
          { label: "Awarded",        value: `${awarded}`,   sub: `${awardedPct}% of total`, color: "text-emerald-600" },
          { label: "In Progress",    value: `${total - awarded}`, sub: "",            color: "text-blue-600"   },
          { label: "Budget Balance", value: "₹354,000,000",     sub: "of ₹450,000,000",  color: "text-slate-900"  },
        ].map(s => (
          <div key={s.label} className="px-3 py-2.5 text-center">
            <p className="text-[8px] text-slate-400 leading-tight">{s.label}</p>
            <p className={`text-sm font-extrabold leading-tight mt-0.5 ${s.color}`}>{s.value}</p>
            {s.sub && <p className="text-[8px] text-slate-400 leading-tight">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="p-4 space-y-3.5">
        {/* Stage distribution bar */}
        <div>
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Stage Distribution</p>
          <div className="flex rounded-full overflow-hidden h-3 gap-px">
            {stages.map(s => (
              <div key={s.name} className={s.color} style={{ width: `${(s.count / total) * 100}%` }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {stages.map(s => (
              <div key={s.name} className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.color}`} />
                <span className="text-[8px] text-slate-500 truncate">{s.name.replace("Negotiation", "Neg.").replace("Commercial ", "Comm. ")} {s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget breakdown */}
        <div>
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Budget Breakdown</p>
          <div className="flex rounded-full overflow-hidden h-2.5 bg-slate-100">
            <div className="bg-emerald-500 rounded-full transition-all" style={{ width: `${awardedPct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-[8px] text-slate-500">Awarded ₹96,248,566</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-200 flex-shrink-0" />
              <span className="text-[8px] text-slate-500">Balance ₹354,000,000</span>
            </div>
          </div>
        </div>

        {/* Package list */}
        <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-50">
          {pkgs.map((p, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <span className="text-[8px] text-slate-300 w-3 flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium text-slate-800 truncate">{p.name}</p>
                <p className="text-[8px] text-slate-400">{p.cat}</p>
              </div>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium border ${p.stageCls} flex-shrink-0`}>
                {p.stage.split(" ").slice(-1)[0]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Feature cards ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Package,
    color: "text-violet-600 bg-violet-50",
    title: "Package Lifecycle",
    desc: "Track every procurement package through fixed stages — from Spec Received to Award. Always know what's waiting on you.",
    mockup: <StageMockup />,
  },
  {
    icon: Award,
    color: "text-emerald-600 bg-emerald-50",
    title: "Vendor Comparison",
    desc: "Log bids from multiple vendors side-by-side. Score, compare, and award with a single click. Full history retained.",
    mockup: <VendorMockup />,
  },
  {
    icon: BarChart3,
    color: "text-amber-600 bg-amber-50",
    title: "Budget Analytics",
    desc: "Visualise budget utilisation across every project. Spot overspend before it happens with real-time award totals.",
    mockup: <AnalyticsMockup />,
  },
  {
    icon: Clock,
    color: "text-rose-600 bg-rose-50",
    title: "Audit Trail",
    desc: "Every action logged automatically — who changed what and when. Built-in compliance ready for any client or regulator.",
    mockup: <AuditMockup />,
  },
  {
    icon: Users,
    color: "text-indigo-600 bg-indigo-50",
    title: "Team & Roles",
    desc: "Invite your whole team. Admins manage the project, editors update packages, viewers watch progress — no seat limits.",
    mockup: <TeamMockup />,
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Register your organisation",
    desc: "Sign up in 30 seconds. Your workspace is private and isolated from day one — no shared databases, no data mixing.",
  },
  {
    step: "02",
    title: "Create a project and add packages",
    desc: "Each project holds procurement packages. Add a package per scope item — civils, M&E, fit-out, FF&E — however you structure your work.",
  },
  {
    step: "03",
    title: "Track, compare, and award",
    desc: "Move packages through stages, log vendor bids, attach documents, and record the award. Your team sees everything in real time.",
  },
];

const PRICING = [
  {
    name:      "Trial",
    tag:       "Get started free",
    price:     "Free",
    period:    "14 days",
    seats:     null,
    seatNote:  null,
    highlight: false,
    cta:       "Start free trial",
    action:    "signup" as const,
    features:  [
      "Up to 3 team members",
      "Unlimited packages",
      "All core features",
      "No credit card needed",
    ],
  },
  {
    name:      "Small Teams",
    tag:       "Most popular",
    price:     null,
    period:    "billed annually",
    seats:     5,
    seatNote:  "5 seats included",
    highlight: true,
    cta:       "Get a quote",
    action:    "contact" as const,
    features:  [
      "5 seats — fixed annual pack",
      "Unlimited packages & projects",
      "Budget analytics",
      "Document storage",
      "Audit trail",
      "Email support",
    ],
  },
  {
    name:      "Teams",
    tag:       "Scale as you grow",
    price:     null,
    period:    "per seat / month",
    seats:     10,
    seatNote:  "Minimum 10 seats",
    highlight: false,
    cta:       "Get a quote",
    action:    "contact" as const,
    features:  [
      "Minimum 10 seats included",
      "Every additional seat billed per user",
      "Everything in Small Teams",
      "GDPR data export",
      "Priority support",
      "Dedicated onboarding",
    ],
  },
];

// ─── Main landing page ────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | null>(null);
  const showAuth = authMode !== null;
  const openLogin  = () => setAuthMode("login");
  const openSignup = () => router.push("/register");
  const closeAuth  = () => setAuthMode(null);

  // ── Contact form state ──
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', company: '', message: '' });
  const [contactSending, setContactSending] = useState(false);
  const [contactDone, setContactDone]       = useState(false);
  const [contactError, setContactError]     = useState('');

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(''); setContactSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setContactDone(true);
      setContactForm({ name: '', email: '', phone: '', company: '', message: '' });
    } catch (err: any) {
      setContactError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setContactSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">ProcureTrack</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" className="hidden sm:block text-sm text-slate-500 hover:text-slate-900 transition">Features</a>
            <a href="#pricing" className="hidden sm:block text-sm text-slate-500 hover:text-slate-900 transition">Pricing</a>
            <button
              onClick={openLogin}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Sign in
            </button>
            <button
              onClick={openSignup}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5"
            >
              Start free trial <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="pt-20 pb-16 px-6 text-center bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium mb-6">
            <Zap className="w-3 h-3" /> Built for project managers · No spreadsheets
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight mb-4">
            Procurement tracking<br />
            <span className="text-blue-600">made simple</span>
          </h1>
          <p className="text-xl sm:text-2xl font-semibold text-slate-700 mb-4">
            One Dashboard &mdash; The End of Weekly Reports
          </p>
          <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto mb-8">
            From spec to award — every package tracked, every vendor compared, every decision logged.
            The dashboard your project team will actually use.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <button
              onClick={openSignup}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md shadow-blue-200"
            >
              Start your free 14-day trial <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={openLogin}
              className="w-full sm:w-auto px-6 py-3 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition text-sm"
            >
              Sign in to existing account
            </button>
          </div>

          {/* Hero dashboard mockup */}
          <div className="max-w-2xl mx-auto">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <section className="py-10 border-y border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: "100+",  label: "Packages per project" },
            { value: "6",     label: "Procurement stages"   },
            { value: "GDPR",  label: "Compliant by design"  },
            { value: "14-day", label: "Free trial, no card" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-extrabold text-blue-600">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
              Everything a project manager needs
            </h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              No configuration. No training sessions. Open it and start tracking.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-5">{f.desc}</p>
                {/* Inline mockup */}
                <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 p-3">
                  {f.mockup}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Execution Dashboard spotlight ───────────────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-center">
          {/* Copy */}
          <div className="flex-1 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-100 text-xs font-medium">
              <Activity className="w-3.5 h-3.5" /> Execution Dashboard
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-snug">
              Track delivery progress,<br />not just procurement
            </h2>
            <p className="text-blue-200 leading-relaxed text-base">
              Once a package is awarded, the work begins. ProcureTrack's Execution Dashboard
              lets you track every delivery milestone — from Mobilisation to Handover — with
              real-time progress bars your whole team can update.
            </p>
            <ul className="space-y-3">
              {[
                "6 standard milestones per package: Mobilisation → Handover",
                "Drag-to-update progress bars — no forms to fill",
                "Overall completion score calculated automatically",
                "See which packages are lagging at a glance",
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-blue-100">
                  <CheckCircle2 className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={openSignup}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-50 transition"
            >
              Try the execution dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {/* Mockup */}
          <div className="flex-1 w-full max-w-md">
            <ExecutionMockup />
          </div>
        </div>
      </section>

      {/* ── Purchasing Dashboard spotlight ──────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row-reverse gap-12 items-center">
          {/* Copy */}
          <div className="flex-1 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-slate-300 text-xs font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Purchasing Dashboard
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-snug">
              Full procurement visibility,<br />from spec to award
            </h2>
            <p className="text-slate-400 leading-relaxed text-base">
              ProcureTrack's Purchasing Dashboard gives you a live view of every package —
              what's awarded, what's in negotiation, and exactly where your budget stands.
              No status meetings required.
            </p>
            <ul className="space-y-3">
              {[
                "Pipeline bar shows stage distribution across all packages at a glance",
                "Budget breakdown: awarded vs remaining, always up to date",
                "Sort and filter 100+ packages by category, stage, or value",
                "Award value, vendor count, and lead time tracked per package",
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={openSignup}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-100 transition"
            >
              Try the purchasing dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {/* Mockup */}
          <div className="flex-1 w-full max-w-md">
            <PurchasingMockup />
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
              Up and running in minutes
            </h2>
            <p className="text-slate-500 text-base">Three steps. No IT department required.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(100%-1rem)] w-8 text-slate-300">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 h-full">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center text-lg font-extrabold mb-4 tracking-tight">
                    {step.step}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why simple matters ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              A management dashboard<br />
              <span className="text-blue-600">built for clarity</span>
            </h2>
            <p className="text-slate-500 leading-relaxed">
              Most procurement tools overwhelm managers with data they don't need.
              ProcureTrack gives decision-makers a single, clear view of every package —
              <em>what's the status, who are the vendors, and what was awarded?</em>
            </p>
            <ul className="space-y-3">
              {[
                "No training required — intuitive enough for any manager",
                "Works on desktop, tablet, and mobile",
                "Your org's data is private — fully isolated from other companies",
                "GDPR-compliant with one-click data export",
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={openSignup}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
            >
              Try it free <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-4">
            <StageMockup />
            <VendorMockup />
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
              Simple, honest pricing
            </h2>
            <p className="text-slate-500 text-base">Start free. Upgrade when your team grows.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {PRICING.map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl p-7 flex flex-col relative ${
                  plan.highlight
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-200 ring-2 ring-blue-400 md:scale-105"
                    : "bg-white border border-slate-200"
                }`}
              >
                {/* Tag badge */}
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${plan.highlight ? "text-blue-200" : "text-slate-400"}`}>
                  {plan.tag}
                </div>

                {/* Plan name */}
                <h3 className={`text-lg font-extrabold mb-4 ${plan.highlight ? "text-white" : "text-slate-900"}`}>
                  {plan.name}
                </h3>

                {/* Price block */}
                <div className="mb-5">
                  {plan.price ? (
                    <div className="flex items-end gap-1">
                      <span className={`text-4xl font-extrabold ${plan.highlight ? "text-white" : "text-slate-900"}`}>
                        {plan.price}
                      </span>
                      <span className={`text-sm mb-1 ${plan.highlight ? "text-blue-200" : "text-slate-400"}`}>
                        /{plan.period}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className={`text-2xl font-extrabold ${plan.highlight ? "text-white" : "text-slate-900"}`}>
                        Contact for pricing
                      </p>
                      <p className={`text-xs mt-1 ${plan.highlight ? "text-blue-200" : "text-slate-500"}`}>
                        {plan.period} · pricing in ₹
                      </p>
                    </div>
                  )}

                  {/* Seat pill */}
                  {plan.seatNote && (
                    <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold ${
                      plan.highlight ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
                    }`}>
                      <Users className="w-3 h-3" />
                      {plan.seatNote}
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1 mb-7">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-blue-200" : "text-emerald-500"}`} />
                      <span className={plan.highlight ? "text-white" : "text-slate-600"}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={plan.action === "signup" ? openSignup : () => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
                    plan.highlight
                      ? "bg-white text-blue-600 hover:bg-blue-50"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-8">
            Pricing in Indian Rupees (₹) · All plans include full feature access · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
              Get in touch
            </h2>
            <p className="text-slate-500 text-base leading-relaxed">
              Have a question, a custom requirement, or want a demo?<br />
              Leave your details and we'll get back to you within one business day.
            </p>
          </div>

          {contactDone ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10 text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-emerald-900 mb-2">Message sent!</h3>
              <p className="text-emerald-700 text-sm mb-6">
                Thanks for reaching out. We'll reply to <strong>{contactForm.email || 'your email'}</strong> shortly.
              </p>
              <button
                onClick={() => setContactDone(false)}
                className="text-sm text-emerald-700 underline hover:text-emerald-900 transition"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleContact} className="bg-slate-50 border border-slate-200 rounded-2xl p-8 space-y-5">
              {contactError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {contactError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={contactForm.name}
                    onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Smith"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={contactForm.email}
                    onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jane@company.com"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Phone <span className="text-slate-400 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={contactForm.phone}
                    onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Company <span className="text-slate-400 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={contactForm.company}
                    onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))}
                    placeholder="Acme Construction"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={contactForm.message}
                  onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us about your project, team size, or any questions you have…"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={contactSending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {contactSending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>Send Message <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Ready to ditch the spreadsheets?
          </h2>
          <p className="text-blue-200 text-base mb-8 leading-relaxed">
            Set up your organisation in 30 seconds. No credit card. No sales call.
            Just a cleaner way to track procurement.
          </p>
          <button
            onClick={openSignup}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition text-sm shadow-lg"
          >
            Start your free 14-day trial <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-700 text-sm">ProcureTrack</span>
          </div>
          <p className="text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} ProcureTrack · GDPR compliant · All rights reserved
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <a href="#features" className="hover:text-slate-600 transition">Features</a>
            <a href="#pricing"  className="hover:text-slate-600 transition">Pricing</a>
            <a href="#contact"  className="hover:text-slate-600 transition">Contact</a>
            <button onClick={openLogin} className="hover:text-slate-600 transition">Sign in</button>
          </div>
        </div>
      </footer>

      {/* ── Auth modal ───────────────────────────────────────────────────────── */}
      {showAuth && <LoginModal onClose={closeAuth} initialMode={authMode ?? "login"} />}
    </div>
  );
}
