"use client";

import { useState } from "react";
import {
  X, BookOpen, LayoutDashboard, FolderOpen, Layers, Package,
  Users, Receipt, BarChart3, Settings, Lock, ChevronRight,
  CheckCircle2, AlertCircle, Info, Lightbulb, ArrowRight,
  Shield, Building2, Tag, Zap, ClipboardList, Crown, CalendarDays,
} from "lucide-react";

// ─── Section types ────────────────────────────────────────────────────────────

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
}

const SECTIONS: Section[] = [
  { id: "overview",    label: "Overview",               icon: BookOpen },
  { id: "dashboard",   label: "Dashboard",              icon: LayoutDashboard },
  { id: "projects",    label: "Projects",               icon: FolderOpen },
  { id: "categories",  label: "Categories",             icon: Layers },
  { id: "packages",    label: "Packages",               icon: Package },
  { id: "execution",   label: "Execution & Milestones", icon: ClipboardList },
  { id: "stages",      label: "Procurement Stages",     icon: ArrowRight },
  { id: "vendors",     label: "Vendors",                icon: Users },
  { id: "billing",     label: "Billing & Invoices",     icon: Receipt },
  { id: "analytics",   label: "Analytics",              icon: BarChart3 },
  { id: "editmode",    label: "Edit Mode",              icon: Lock },
  { id: "users",       label: "User Management",        icon: Shield },
  { id: "settings",    label: "Settings",               icon: Settings },
];

// ─── Small helper components ──────────────────────────────────────────────────

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3.5 mt-4">
      <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-blue-800 leading-relaxed">{children}</p>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5 mt-4">
      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800 leading-relaxed">{children}</p>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex-shrink-0">{n}</span>
  );
}

function StagePill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-slate-900 mb-1">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-800 mt-5 mb-2">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-600 leading-relaxed">{children}</p>;
}
function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
      <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

// ─── Section content ──────────────────────────────────────────────────────────

function SectionOverview() {
  return (
    <div>
      <H2>Welcome to ProcureTrack</H2>
      <p className="text-xs text-slate-400 mb-4">Your end-to-end procurement and execution lifecycle tracker</p>
      <P>
        ProcureTrack is a full-lifecycle procurement management system for engineering and
        infrastructure projects. It gives your team a single source of truth — from initial
        specification through award, billing, and on-site execution.
      </P>

      <H3>Two flows in one app</H3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-800 mb-1">Purchasing Flow</p>
          <p className="text-[12px] text-blue-700 leading-relaxed">
            Track each package through the five procurement stages (Spec → RFQ → Negotiation → Award),
            manage vendor bids, and record invoices.
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-800 mb-1">Execution Flow</p>
          <p className="text-[12px] text-emerald-700 leading-relaxed">
            Once awarded, track on-site progress across six milestones — Mobilisation to Handover.
            Break each milestone into dated subtasks; milestone progress auto-computes from subtask averages
            and rolls up to a package and project timeline.
          </p>
        </div>
      </div>

      <H3>Organisation & plans</H3>
      <P>
        ProcureTrack is multi-tenant. Each company registers as its own <strong>Organisation</strong>.
        Organisations run on a subscription plan (Trial / Starter / Pro / Enterprise). If a plan
        lapses, the organisation enters <strong>read-only mode</strong> — all data remains visible
        but nothing can be edited or deleted until the plan is renewed.
      </P>

      <H3>Who can do what</H3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
        {[
          { role: "Owner / Admin", color: "bg-violet-50 border-violet-200 text-violet-700",   desc: "Full access: manage users, settings, all project data, and export." },
          { role: "Editor",        color: "bg-emerald-50 border-emerald-200 text-emerald-700", desc: "Can edit packages, vendors, invoices, remarks, and milestones." },
          { role: "Viewer",        color: "bg-slate-50 border-slate-200 text-slate-600",       desc: "Read-only access to all projects and packages." },
        ].map(r => (
          <div key={r.role} className={`rounded-xl border p-3 ${r.color}`}>
            <p className="text-xs font-semibold mb-1">{r.role}</p>
            <p className="text-[11px] leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      <H3>Sessions</H3>
      <P>
        For security, login sessions are <strong>not persisted</strong> after the browser is closed.
        You will need to sign in again each time you open a new browser session.
      </P>

      <Tip>
        Use the <strong>Help Guide</strong> icon (?) in the header at any time to return here.
        Each section below maps directly to a part of the app.
      </Tip>
    </div>
  );
}

function SectionDashboard() {
  return (
    <div>
      <H2>Dashboard</H2>
      <p className="text-xs text-slate-400 mb-4">Your portfolio-level command centre</p>
      <P>
        The main dashboard gives you a bird's-eye view of every project in your portfolio.
        It is the first screen you see after logging in.
      </P>

      <H3>Portfolio Summary card</H3>
      <P>
        At the top you'll find five flex stats — Available Capital, Awarded Rate, Billed to Date,
        Billing Rate, and Milestone Progress — alongside a dual-ring donut chart. The outer ring
        shows how much of the total budget has been awarded; the inner ring shows how much of
        the awarded value has been billed.
      </P>

      <H3>Stat cards</H3>
      <ul className="space-y-2 mt-1">
        <Li><strong>Active Projects</strong> — count of your projects; expand to see status per project</Li>
        <Li><strong>Total Packages</strong> — all packages across every project</Li>
        <Li><strong>Total Budget</strong> — sum of budgets; expand for per-project breakdown</Li>
        <Li><strong>Awarded Pipeline</strong> — total value of all awarded packages</Li>
        <Li><strong>Total Billed</strong> — sum of all invoices; expand for per-project billing rate</Li>
      </ul>
      <Tip>Click any stat card to expand it and see a per-project breakdown.</Tip>

      <H3>Procurement Pipeline bar</H3>
      <P>
        The coloured horizontal bar shows the distribution of all packages across the five
        procurement stages. Each segment is labelled with the count.
      </P>

      <H3>Execution Tracking card</H3>
      <P>
        Below the pipeline bar, the Execution Tracking section shows milestone completion across
        all packages — a summary of how much physical work is done on site.
      </P>

      <H3>Project Portfolio grid</H3>
      <P>
        Each project card shows its budget, package count, awarded value, budget utilisation
        bar, and last-modified date. Click <strong>Open Project →</strong> to drill into it.
      </P>
      <Tip>
        Use the search bar in the header to filter projects by name or client in real time.
      </Tip>
    </div>
  );
}

function SectionProjects() {
  return (
    <div>
      <H2>Projects</H2>
      <p className="text-xs text-slate-400 mb-4">Top-level containers for procurement packages</p>
      <P>
        A <strong>Project</strong> represents a complete engineering or construction programme
        (e.g. "Oceanic Oil Refinery"). Each project has its own budget and a collection of
        procurement packages, each of which can be in either Purchasing or Execution flow.
      </P>

      <H3>Creating a project</H3>
      <ol className="space-y-2 mt-1">
        {[
          "Enable Edit Mode using the button in the header.",
          'Click the blue "+ New Project" button on the dashboard.',
          "Enter the project name, client, and total budget.",
          "Click Create. The new project card appears in the portfolio grid.",
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <StepBadge n={i + 1} />
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <H3>Editing project budget</H3>
      <P>
        While in Edit Mode, open the project, then click the pencil icon next to the budget
        figure to type a new value. Press Enter or click away to save.
      </P>

      <H3>Changing project status</H3>
      <P>
        Three statuses are available: <strong>Active</strong>, <strong>On Hold</strong>, and{" "}
        <strong>Completed</strong>. In Edit Mode, use the status dropdown on the project card
        in the dashboard portfolio grid.
      </P>

      <H3>Project page layout</H3>
      <P>
        Inside a project you'll see the <strong>Project Analytics</strong> card (package status,
        budget breakdown), followed by the <strong>Categories grid</strong>. Click any category
        card to open its package list, or click the stat cards (Total / Awarded / In Progress) to
        see a cross-category filtered list.
      </P>

      <Note>
        Deleting a project permanently removes it along with all its packages, vendors, invoices,
        remarks, and documents. This action cannot be undone.
      </Note>
    </div>
  );
}

function SectionCategories() {
  return (
    <div>
      <H2>Categories</H2>
      <p className="text-xs text-slate-400 mb-4">Discipline-based groupings for packages</p>
      <P>
        Categories let you group packages by engineering discipline or trade — for example
        Mechanical, Civil, Electrical, Instrumentation, Services. Each project's categories are
        derived automatically from the packages it contains.
      </P>

      <H3>Managing global categories</H3>
      <P>
        Categories are managed from the Admin Panel → Categories tab. An admin can add or
        remove categories. Any package can then be assigned to any available category.
      </P>

      <H3>Category cards</H3>
      <P>Each category card on the project page shows:</P>
      <ul className="space-y-2 mt-1">
        <Li><strong>Package count</strong> — how many packages are in this category</Li>
        <Li><strong>Awarded Value</strong> — sum of award values for awarded packages</Li>
        <Li><strong>Awarded ratio</strong> — e.g. 2/9 packages awarded</Li>
        <Li><strong>Progress bar</strong> — visual % of packages that are awarded</Li>
      </ul>
      <Tip>
        Click a category card to open the package table filtered to that discipline.
      </Tip>
    </div>
  );
}

function SectionPackages() {
  return (
    <div>
      <H2>Packages</H2>
      <p className="text-xs text-slate-400 mb-4">The core unit of procurement tracking</p>
      <P>
        A <strong>Package</strong> is a single procurement work scope — for example
        "Centrifugal Pumps" or "SCADA System". Every package belongs to one project and one
        category, has its own procurement stage, and tracks vendors, documents, remarks,
        invoices, and execution milestones.
      </P>

      <H3>Creating a package</H3>
      <ol className="space-y-2 mt-1">
        {[
          "Enable Edit Mode.",
          "Open a project, then click '+ Add Package'.",
          "Select the Category, enter a Package Name, and choose Origin (Domestic / Import) and Currency.",
          "Click Create Package. It appears in the category table.",
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <StepBadge n={i + 1} />
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <H3>Two views per package</H3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
          <p className="text-xs font-semibold text-blue-800 mb-1">Purchasing view (default)</p>
          <p className="text-[12px] text-blue-700 leading-relaxed">
            Stage stepper, vendor matrix, remarks, documents, billing, audit trail.
            Use this to manage the procurement lifecycle up to and including award.
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
          <p className="text-xs font-semibold text-emerald-800 mb-1">Execution view</p>
          <p className="text-[12px] text-emerald-700 leading-relaxed">
            Six milestones (Mobilisation → Handover), each broken into dated subtasks.
            Milestone progress auto-computes from subtask averages. Dates roll up to the
            package header and the project execution dashboard.
          </p>
        </div>
      </div>

      <H3>Package detail sections (Purchasing view)</H3>
      <ul className="space-y-2 mt-2">
        <Li><strong>Package info card</strong> — category, origin, currency, live lead time</Li>
        <Li><strong>Procurement Timeline</strong> — interactive stage stepper; click a node to advance or revert</Li>
        <Li><strong>Vendor Matrix</strong> — all vendors with quoted and revised amounts</Li>
        <Li><strong>Remarks</strong> — free-text notes with timestamps</Li>
        <Li><strong>Documents</strong> — file reference log</Li>
        <Li><strong>Billing</strong> — invoice list (visible once package is awarded)</Li>
        <Li><strong>Audit Trail</strong> — full change history</Li>
      </ul>

      <Note>
        Deleting a package removes all its vendors, invoices, and history permanently. Only
        admins or editors in Edit Mode can delete packages.
      </Note>
    </div>
  );
}

function SectionExecution() {
  const milestones = [
    { name: "Mobilisation",            desc: "Team, equipment, and site access are being established." },
    { name: "Preliminaries",           desc: "Temporary works, site offices, and enabling work." },
    { name: "Procurement",             desc: "Materials and sub-contractor orders are placed and in delivery." },
    { name: "Installation",            desc: "Physical installation of the scope is underway." },
    { name: "Testing & Commissioning", desc: "System tests, punch list clearance, and sign-off." },
    { name: "Handover",                desc: "Scope delivered; final documentation and handover complete." },
  ];

  return (
    <div>
      <H2>Execution &amp; Milestones</H2>
      <p className="text-xs text-slate-400 mb-4">Subtask-driven delivery tracking with date roll-up</p>
      <P>
        The <strong>Execution view</strong> on each package shows six milestone phases. Each
        milestone is driven by its own <strong>subtasks</strong> — the milestone progress bar
        auto-computes as the average of its subtask completion percentages. You cannot drag
        milestone bars directly; they update automatically as you progress the tasks.
      </P>

      <H3>The six milestones</H3>
      <div className="mt-3 space-y-2">
        {milestones.map((m, i) => (
          <div key={m.name} className="flex gap-3 items-start text-sm">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div>
              <span className="font-medium text-slate-800">{m.name}</span>
              <span className="text-slate-500"> — {m.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <H3>Opening the Execution view</H3>
      <ol className="space-y-2 mt-1">
        {[
          "Open any package detail page.",
          "Click the 'Execution' tab near the top of the page.",
          "Edit Mode enables automatically in this view.",
          "Expand a milestone by clicking its row arrow (▶), then click '+ tasks' to add subtasks.",
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <StepBadge n={i + 1} />
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <H3>Adding a subtask</H3>
      <ol className="space-y-2 mt-1">
        {[
          "Click '+ tasks' on the right edge of any milestone row — the row expands and an add form appears.",
          "Type the task name.",
          "Click the start-date calendar icon and pick a date; do the same for the end date.",
          "Both dates are required — the task will not be created without them, and the end date must be after the start date.",
          "Press Enter or click '+ Add'. The task appears immediately and the milestone progress updates.",
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <StepBadge n={i + 1} />
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <H3>Updating task progress</H3>
      <P>
        Each task row has its own drag bar. Drag it left or right to set the completion
        percentage. The task's milestone bar recalculates immediately. Note: <strong>a task's
        progress bar is locked until both start and end dates are set.</strong> Attempting to
        drag a date-less bar shows a reminder toast.
      </P>

      <H3>Editing task details</H3>
      <ul className="space-y-2 mt-1">
        <Li><strong>Name</strong> — click the task name inline and type; saves on focus-out.</Li>
        <Li><strong>Dates</strong> — click either calendar icon on the task row to change the date; saves on focus-out.</Li>
        <Li><strong>Delete</strong> — click the bin icon on the right of the task row. The milestone recalculates.</Li>
      </ul>

      <H3>Date timelines &amp; roll-up</H3>
      <div className="mt-2 space-y-2">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-slate-700">Milestone header</p>
          </div>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            Shows the earliest task start date → latest task end date across all tasks in that milestone.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-slate-700">Package header</p>
          </div>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            The package info card shows an <strong>Execution timeline</strong> pill — the
            overall span of all tasks across all milestones for that package.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-slate-700">Project execution dashboard</p>
          </div>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            The project-level execution dashboard header shows the overall project date range
            (earliest package start → latest package end). Each package card shows its own
            date range beneath the package name.
          </p>
        </div>
      </div>

      <H3>Overall completion</H3>
      <P>
        The <strong>Overall completion</strong> bar at the top of the milestone tracker shows
        the simple average of all six milestone percentages (each of which is the average of
        its subtasks). When all milestones reach 100 %, the count shows "6/6 complete".
      </P>

      <H3>Execution Tracking on the dashboard</H3>
      <P>
        The dashboard's <strong>Execution Tracking</strong> card aggregates milestone data across
        all packages, giving you a portfolio-wide view of physical delivery progress.
      </P>

      <Tip>
        Milestones with no subtasks show 0 % until at least one task is added. Adding and
        completing even a single task immediately moves the milestone off zero.
      </Tip>

      <Note>
        Milestone bars are always read-only — they reflect subtask averages only. If your
        organisation plan has lapsed, task creation and editing are disabled.
      </Note>
    </div>
  );
}

function SectionStages() {
  const stages = [
    { name: "Spec Received",           color: "bg-slate-100 text-slate-700",     desc: "Technical specification received. Package enters the procurement pipeline." },
    { name: "RFQ Float",               color: "bg-blue-50 text-blue-700",        desc: "Request for Quotation issued to shortlisted vendors. Awaiting bids." },
    { name: "Technical Negotiation",   color: "bg-blue-100 text-blue-800",       desc: "Vendor bids under technical review. Clarifications and exceptions being resolved." },
    { name: "Commercial Negotiation",  color: "bg-blue-200 text-blue-900",       desc: "Technical scope aligned. Price and commercial terms being negotiated." },
    { name: "Award",                   color: "bg-emerald-100 text-emerald-800", desc: "Package awarded to a vendor. Award value and vendor recorded; billing unlocked." },
  ];

  return (
    <div>
      <H2>Procurement Stages</H2>
      <p className="text-xs text-slate-400 mb-4">The five-stage lifecycle of a procurement package</p>
      <P>
        Every package moves through five sequential stages. The <strong>Procurement Timeline</strong>
        stepper on the package detail page lets you advance or revert stages. The stepper and
        the Stage Progress bar at the top update instantly when you click a stage node.
      </P>

      <div className="mt-4 space-y-3">
        {stages.map((s, i) => (
          <div key={s.name} className="flex gap-3 items-start">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
              {i < stages.length - 1 && <div className="w-px h-6 bg-slate-200 mt-1" />}
            </div>
            <div className="pb-2">
              <div className="flex items-center gap-2 mb-1">
                <StagePill label={s.name} color={s.color} />
              </div>
              <P>{s.desc}</P>
            </div>
          </div>
        ))}
      </div>

      <H3>Using the stage stepper</H3>
      <P>
        Each stage is shown as a numbered circle. Click <strong>either the circle or the
        label text</strong> beneath it to move to that stage. Only the next stage (one ahead)
        and already-completed stages are clickable. Skipping stages is not allowed — advance
        one step at a time.
      </P>

      <H3>Awarding a package</H3>
      <ol className="space-y-2 mt-1">
        {[
          "Be in Edit Mode.",
          "Open the package detail page.",
          "Click the 'Award' node (circle or label) in the Procurement Timeline.",
          "In the award modal, enter the final award value and select or type the vendor name.",
          "Click Confirm Award. The stage locks, award value is recorded, and the Billing section becomes available.",
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <StepBadge n={i + 1} />
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <Tip>
        The award modal shows available budget (total project budget minus other awarded packages)
        and warns if the award value would exceed it.
      </Tip>
    </div>
  );
}

function SectionVendors() {
  return (
    <div>
      <H2>Vendors</H2>
      <p className="text-xs text-slate-400 mb-4">Track all bidders and their pricing for each package</p>
      <P>
        The <strong>Vendor Matrix</strong> on each package detail page lists every vendor
        who submitted a bid. For each vendor you record:
      </P>
      <ul className="space-y-2 mt-2">
        <Li><strong>Vendor Name</strong> — the company's name</Li>
        <Li><strong>Quoted Amount</strong> — the original bid value</Li>
        <Li><strong>Revised Amount</strong> — the negotiated or updated value</Li>
      </ul>

      <H3>Adding a vendor</H3>
      <ol className="space-y-2 mt-1">
        {[
          "Enable Edit Mode.",
          "Open the package detail page.",
          "Scroll to the Vendor Matrix section.",
          "Click '+ Add Vendor', fill in the name and amounts, then click Add.",
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <StepBadge n={i + 1} />
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <H3>Awarded vendor highlight</H3>
      <P>
        Once a package is awarded, the winning vendor row is highlighted in the matrix.
        The award value shown in the table header comes from the award modal — it can
        differ from the revised amount field.
      </P>

      <Tip>
        You can have multiple vendors at any stage. Keeping all bidders lets you reference
        the competitive landscape and negotiation history later.
      </Tip>
    </div>
  );
}

function SectionBilling() {
  return (
    <div>
      <H2>Billing &amp; Invoices</H2>
      <p className="text-xs text-slate-400 mb-4">Track invoices raised against awarded packages</p>
      <P>
        Once a package reaches the <strong>Award</strong> stage, the <strong>Billing</strong>
        section becomes visible on its detail page. Log invoices here and monitor how much
        of the awarded value has been billed.
      </P>

      <H3>Adding an invoice</H3>
      <ol className="space-y-2 mt-1">
        {[
          "The package must be in the Award stage.",
          "Enable Edit Mode.",
          "Scroll to the Billing section on the package detail page.",
          "Click '+ Add Invoice'.",
          "Enter the invoice amount, invoice number, invoice date, and optional notes.",
          "Click Add Invoice. The billed total updates immediately.",
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <StepBadge n={i + 1} />
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <H3>Billing indicators</H3>
      <ul className="space-y-2 mt-1">
        <Li><strong>Billed Amount</strong> — sum of all invoices for that package</Li>
        <Li><strong>Unbilled Balance</strong> — award value minus billed amount</Li>
        <Li><strong>Budget bar</strong> — on the project page, the dark segment shows the billed portion</Li>
      </ul>

      <H3>Portfolio-level billing</H3>
      <P>
        The Dashboard's <strong>Total Billed</strong> card and <strong>Billed to Date</strong>
        in the Portfolio Summary aggregate billing across all projects. The inner ring of the
        donut chart shows billed as a % of awarded.
      </P>

      <Note>
        Deleting an invoice is permanent. The invoice number field is for reference only
        and is not validated for uniqueness.
      </Note>
    </div>
  );
}

function SectionAnalytics() {
  return (
    <div>
      <H2>Analytics</H2>
      <p className="text-xs text-slate-400 mb-4">Portfolio-wide budget and billing insights</p>
      <P>
        Click the <strong>Analytics</strong> button in the dashboard header to open the
        Budget Analytics panel — a cross-project financial overview.
      </P>

      <H3>Summary cards</H3>
      <ul className="space-y-2 mt-1">
        <Li><strong>Total Budget</strong> — combined budget across all projects</Li>
        <Li><strong>Committed (Awarded)</strong> — total awarded value</Li>
        <Li><strong>Billed</strong> — total invoiced amount</Li>
        <Li><strong>Remaining / Over-budget</strong> — budget minus committed; shown in red if over</Li>
      </ul>

      <H3>Portfolio overview chart</H3>
      <P>
        Three horizontal bars show Budget, Committed, and Billed side by side.
        A dual-ring donut on the right visualises the same proportions.
      </P>

      <H3>Per-project breakdown</H3>
      <P>
        Below the portfolio chart, each project is listed with its own three-bar row.
        A sub-label shows "% of committed billed" to highlight collection efficiency.
      </P>

      <H3>Sortable table</H3>
      <P>
        The table at the bottom can be sorted by Budget, Committed, or Billed by clicking
        the column headers. The bottom row shows portfolio totals.
      </P>

      <Tip>
        Analytics always reflects live data — any award or invoice added while the panel
        is open will appear the next time you open it.
      </Tip>
    </div>
  );
}

function SectionEditMode() {
  return (
    <div>
      <H2>Edit Mode</H2>
      <p className="text-xs text-slate-400 mb-4">Protecting data while enabling changes</p>
      <P>
        Edit Mode is a deliberate gate that prevents accidental data changes. The app is
        read-only by default. You must explicitly enable Edit Mode to create, update, or
        delete records.
      </P>

      <H3>Who can enter Edit Mode</H3>
      <P>
        Only users with the <strong>Can Edit</strong> permission (set by an admin) or the
        <strong> Admin</strong> role can enable Edit Mode. Viewers see all data but the Edit
        Mode button is not available to them.
      </P>

      <H3>Enabling Edit Mode</H3>
      <ol className="space-y-2 mt-1">
        {[
          "Click the lock icon button in the header (labelled 'Enter Edit Mode').",
          "The button turns blue and shows 'Edit Mode ON'.",
          "Editing controls (+ Add, delete buttons, inline inputs) become visible.",
          "Click the button again to exit Edit Mode and lock records.",
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <StepBadge n={i + 1} />
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <H3>Auto-enabled in Execution view</H3>
      <P>
        When you open a package in <strong>Execution view</strong>, Edit Mode is turned on
        automatically so you can drag milestone bars straight away.
      </P>

      <H3>Read-only mode (plan lapsed)</H3>
      <P>
        If your organisation's subscription has expired or been paused, the entire app enters
        <strong> read-only mode</strong>. Edit Mode is disabled for all users, including admins.
        An admin can still <strong>export data</strong> via the Admin Panel → Export tab.
        All data is preserved — nothing is deleted — until the plan is renewed.
      </P>

      <Note>
        The API enforces permissions server-side regardless of Edit Mode. Even if Edit Mode
        were somehow activated, write operations are rejected for users without the correct role.
      </Note>
    </div>
  );
}

function SectionUsers() {
  return (
    <div>
      <H2>User Management</H2>
      <p className="text-xs text-slate-400 mb-4">Admin-only — control who can access and edit data</p>
      <P>
        ProcureTrack is multi-tenant. Every user belongs to exactly one <strong>Organisation</strong>.
        Within an organisation, each user has a role that controls their access level.
      </P>

      <H3>Organisation roles</H3>
      <div className="space-y-3 mt-2">
        {[
          { role: "Owner",   color: "bg-orange-50 border-orange-200",  badge: "bg-orange-100 text-orange-700", desc: "Full access. Can manage all users, settings, billing, and all project data. Created automatically when the organisation is registered." },
          { role: "Admin",   color: "bg-violet-50 border-violet-200",  badge: "bg-violet-100 text-violet-700", desc: "Full access to project data and user management. Same as Owner for day-to-day use." },
          { role: "Viewer",  color: "bg-slate-50 border-slate-200",    badge: "bg-slate-100 text-slate-600",   desc: "Read-only access to all projects and packages. Cannot make any changes." },
        ].map(r => (
          <div key={r.role} className={`rounded-xl border p-3.5 ${r.color}`}>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.badge} mb-2 inline-block`}>{r.role}</span>
            <P>{r.desc}</P>
          </div>
        ))}
      </div>

      <H3>Inviting a new team member</H3>
      <ol className="space-y-2 mt-1">
        {[
          "Go to Admin Panel → Users tab.",
          "Click '+ Add Member' and enter the new user's email address and choose their role.",
          "Alternatively, share your organisation's registration link and have them sign up — ask your platform admin for the invite flow.",
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <StepBadge n={i + 1} />
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <H3>Changing a user's role</H3>
      <P>
        In the Admin Panel → Users tab, use the role dropdown next to any user to change
        their access level immediately. The change takes effect on their next page load.
      </P>

      <H3>Removing a user</H3>
      <P>
        Click the remove button next to a user in the Users tab. This removes them from the
        organisation but does not delete their account. They can be re-added later.
      </P>

      <Note>
        You cannot remove the last Owner of an organisation. Assign another user as Owner first.
      </Note>
    </div>
  );
}

function SectionSettings() {
  return (
    <div>
      <H2>Settings &amp; Admin Panel</H2>
      <p className="text-xs text-slate-400 mb-4">Admin-only — customise your organisation profile and manage data</p>
      <P>
        Click the gear icon (⚙) or the <strong>Admin</strong> button in the dashboard header
        (visible to owners and admins) to open the Admin Panel. It has several tabs:
      </P>

      <H3>Overview tab</H3>
      <P>Shows a summary of your organisation's usage — project count, package count, member count,
        and billing rate at a glance.</P>

      <H3>Users tab</H3>
      <P>Manage team members — add users by email, change roles (Owner / Admin / Viewer), and
        remove members from the organisation.</P>

      <H3>Branding tab</H3>
      <ul className="space-y-2 mt-1">
        <Li><strong>Company Name</strong> — shown in the header, login page, and footer</Li>
        <Li><strong>Tagline</strong> — a short descriptor shown under the name</Li>
        <Li><strong>Logo URL</strong> — paste a public image URL to replace the default icon</Li>
        <Li><strong>Contact Email</strong> — reference email for your organisation</Li>
      </ul>

      <H3>Categories tab</H3>
      <P>
        Add or remove global procurement categories (Civil, Electrical, Mechanical, etc.).
        Categories added here become available when creating a new package.
      </P>

      <H3>Audit Log tab</H3>
      <P>A chronological log of all changes made within the organisation — who changed what and
        when. Useful for accountability and tracing data edits.</P>

      <H3>Export tab</H3>
      <P>
        Download all your organisation's project and package data as a spreadsheet (CSV/Excel).
        This tab remains accessible even when the organisation plan has lapsed, so you can
        always retrieve your data.
      </P>

      <H3>Danger Zone tab</H3>
      <ul className="space-y-2 mt-1">
        <Li><strong>Load Sample Data</strong> — loads 5 demonstration projects with 21 packages each. Skipped automatically if your organisation already has projects.</Li>
        <Li><strong>Wipe All Data</strong> — permanently deletes all projects, packages, and related data. Type "WIPE" to confirm.</Li>
      </ul>

      <Note>
        Wipe All Data is irreversible. All projects, packages, vendors, invoices, remarks,
        documents, and audit trail entries will be permanently deleted.
      </Note>
    </div>
  );
}

const SECTION_CONTENT: Record<string, React.ReactNode> = {
  overview:   <SectionOverview />,
  dashboard:  <SectionDashboard />,
  projects:   <SectionProjects />,
  categories: <SectionCategories />,
  packages:   <SectionPackages />,
  execution:  <SectionExecution />,
  stages:     <SectionStages />,
  vendors:    <SectionVendors />,
  billing:    <SectionBilling />,
  analytics:  <SectionAnalytics />,
  editmode:   <SectionEditMode />,
  users:      <SectionUsers />,
  settings:   <SectionSettings />,
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function HelpGuide({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState("overview");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl my-4 flex overflow-hidden"
        style={{ minHeight: "min(90vh, 720px)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── LEFT SIDEBAR ───────────────────────────────────────────────── */}
        <aside className="w-56 flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col">
          {/* Sidebar header */}
          <div className="px-4 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 leading-none">User Guide</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{SECTIONS.length} sections</p>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto py-2">
            {SECTIONS.map(sec => {
              const Icon = sec.icon;
              const isActive = active === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActive(sec.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span className="text-xs leading-tight">{sec.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="px-4 py-3 border-t border-slate-200">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              ProcureTrack · Internal Use Only
            </p>
          </div>
        </aside>

        {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Content header */}
          <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              {(() => { const sec = SECTIONS.find(s => s.id === active)!; const Icon = sec.icon; return <Icon className="w-4 h-4 text-blue-600" />; })()}
              <p className="text-xs font-medium text-slate-500">
                {SECTIONS.find(s => s.id === active)?.label}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable content body */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {SECTION_CONTENT[active]}
          </div>

          {/* Bottom pagination */}
          <div className="flex items-center justify-between px-8 py-3 border-t border-slate-100 flex-shrink-0 bg-slate-50/50">
            {(() => {
              const idx = SECTIONS.findIndex(s => s.id === active);
              const prev = SECTIONS[idx - 1];
              const next = SECTIONS[idx + 1];
              return (
                <>
                  {prev ? (
                    <button onClick={() => setActive(prev.id)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition font-medium">
                      <ChevronRight className="w-3.5 h-3.5 rotate-180" /> {prev.label}
                    </button>
                  ) : <span />}
                  {next ? (
                    <button onClick={() => setActive(next.id)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition font-medium">
                      {next.label} <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button onClick={onClose} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition font-medium">
                      Done <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
