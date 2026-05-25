"use client";

import { useState } from "react";
import {
  X, BookOpen, LayoutDashboard, FolderOpen, Layers, Package,
  Users, Receipt, BarChart3, Settings, Lock, ChevronRight,
  CheckCircle2, AlertCircle, Info, Lightbulb, ArrowRight,
  Shield, Building2, Tag, Zap,
} from "lucide-react";

// ─── Section types ────────────────────────────────────────────────────────────

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
}

const SECTIONS: Section[] = [
  { id: "overview",    label: "Overview",          icon: BookOpen },
  { id: "dashboard",   label: "Dashboard",         icon: LayoutDashboard },
  { id: "projects",    label: "Projects",          icon: FolderOpen },
  { id: "categories",  label: "Categories",        icon: Layers },
  { id: "packages",    label: "Packages",          icon: Package },
  { id: "stages",      label: "Procurement Stages",icon: ArrowRight },
  { id: "vendors",     label: "Vendors",           icon: Users },
  { id: "billing",     label: "Billing & Invoices",icon: Receipt },
  { id: "analytics",   label: "Analytics",         icon: BarChart3 },
  { id: "editmode",    label: "Edit Mode",         icon: Lock },
  { id: "users",       label: "User Management",   icon: Shield },
  { id: "settings",    label: "Settings",          icon: Settings },
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
      <H2>Welcome to Procurement Dashboard</H2>
      <p className="text-xs text-slate-400 mb-4">Your end-to-end procurement lifecycle tracker</p>
      <P>
        Procurement Dashboard is a full-lifecycle procurement management system designed for
        engineering and infrastructure projects. It lets your team track every procurement
        package — from initial specification through award and billing — in one place.
      </P>

      <H3>What you can do</H3>
      <ul className="space-y-2 mt-1">
        <Li>Create and manage multiple <strong>Projects</strong>, each with its own budget</Li>
        <Li>Organise packages by <strong>Category</strong> (Mechanical, Civil, Electrical, etc.)</Li>
        <Li>Move each <strong>Package</strong> through the five procurement stages</Li>
        <Li>Track <strong>Vendors</strong> — quoted, revised, and awarded values per package</Li>
        <Li>Record <strong>Invoices</strong> and monitor billing against awarded values</Li>
        <Li>View cross-project <strong>Analytics</strong> — budget, committed, billed breakdowns</Li>
      </ul>

      <H3>Who can do what</H3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
        {[
          { role: "Admin",   color: "bg-violet-50 border-violet-200 text-violet-700",  desc: "Full access: manage users, settings, all data" },
          { role: "Editor",  color: "bg-emerald-50 border-emerald-200 text-emerald-700", desc: "Can edit packages, vendors, invoices and remarks" },
          { role: "Viewer",  color: "bg-slate-50 border-slate-200 text-slate-600",    desc: "Read-only access to all projects and packages" },
        ].map(r => (
          <div key={r.role} className={`rounded-xl border p-3 ${r.color}`}>
            <p className="text-xs font-semibold mb-1">{r.role}</p>
            <p className="text-[11px] leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

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
        At the top you'll find four flex stats — Available Capital, Awarded Rate, Billed to Date,
        and Billing Rate — alongside a dual-ring donut chart. The outer ring shows how much of
        the total budget has been awarded; the inner ring shows how much of the awarded value
        has been billed.
      </P>

      <H3>Stat cards (5 cards)</H3>
      <ul className="space-y-2 mt-1">
        <Li><strong>Active Projects</strong> — count of your projects; expand to see status per project</Li>
        <Li><strong>Total Packages</strong> — all packages across every project</Li>
        <Li><strong>Total Budget</strong> — sum of budgets; expand for per-project breakdown</Li>
        <Li><strong>Awarded Pipeline</strong> — total value of all awarded packages</Li>
        <Li><strong>Total Billed</strong> — sum of all invoices raised; expand for per-project billing rate</Li>
      </ul>
      <Tip>Click any stat card to expand it and see a per-project breakdown.</Tip>

      <H3>Procurement Pipeline bar</H3>
      <P>
        The coloured horizontal bar shows the distribution of all packages across the five
        procurement stages. Hover over each segment to see the count and percentage.
      </P>

      <H3>Project Portfolio grid</H3>
      <P>
        Each project card shows its budget, package count, awarded value, budget utilisation
        bar, and last-modified date. Click <strong>Open Project →</strong> to drill into that project.
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
        procurement packages.
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

      <H3>Deleting a project</H3>
      <Note>
        Deleting a project permanently removes it along with all its packages, vendors, invoices,
        remarks, and documents. This action cannot be undone.
      </Note>

      <H3>Project page layout</H3>
      <P>
        Inside a project you'll see the <strong>Project Analytics</strong> card (package status,
        budget breakdown), followed by the <strong>Categories grid</strong>. Click any category
        card to open its package list, or click the stat cards (Total / Awarded / In Progress) to
        see a cross-category filtered list.
      </P>
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
        Mechanical, Civil, Electrical, Instrumentation, IT. Each project's categories are
        derived automatically from the packages it contains.
      </P>

      <H3>Managing global categories</H3>
      <P>
        Categories are managed globally (not per-project) from the Admin Settings panel
        (gear icon). An admin can add or remove categories. Any package can then be assigned
        to any category.
      </P>

      <H3>Category cards</H3>
      <P>
        Each category card on the project page shows:
      </P>
      <ul className="space-y-2 mt-1">
        <Li><strong>Package count</strong> — how many packages are in this category</Li>
        <Li><strong>Awarded Value</strong> — sum of award values for awarded packages</Li>
        <Li><strong>Awarded ratio</strong> — e.g. 2/9 packages awarded</Li>
        <Li><strong>Progress bar</strong> — visual % of packages that are awarded</Li>
      </ul>
      <Tip>
        Click a category card to open the package table filtered to that discipline. From there
        you can further filter by stage or award status.
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
        category, has its own procurement stage, and tracks its own vendors, documents,
        remarks, and invoices.
      </P>

      <H3>Creating a package</H3>
      <ol className="space-y-2 mt-1">
        {[
          "Enter Edit Mode.",
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

      <H3>Package detail page</H3>
      <P>Click any row in the package table to open the full package detail page. It contains:</P>
      <ul className="space-y-2 mt-2">
        <Li><strong>Package info card</strong> — category, origin, currency, lead time</Li>
        <Li><strong>Stage Stepper</strong> — move the package through procurement stages</Li>
        <Li><strong>Vendor Matrix</strong> — all vendors with quoted and revised amounts</Li>
        <Li><strong>Remarks</strong> — free-text notes with timestamps</Li>
        <Li><strong>Documents</strong> — file reference log</Li>
        <Li><strong>Billing</strong> — invoice list (visible once package is awarded)</Li>
        <Li><strong>Audit Trail</strong> — full change history</Li>
      </ul>

      <H3>Navigating from stat cards</H3>
      <P>
        On the project page, clicking <strong>Total</strong> shows all packages across all
        categories. <strong>Awarded</strong> shows only awarded packages. <strong>In Progress</strong>
        shows only packages still in negotiation. Each filtered list has a Category column — clicking
        the chip drills into that category's full table.
      </P>

      <Note>
        Deleting a package removes all its vendors, invoices, and history. Only admins or editors
        in Edit Mode can delete packages.
      </Note>
    </div>
  );
}

function SectionStages() {
  const stages = [
    { name: "Spec Received",           color: "bg-slate-100 text-slate-700",    desc: "Technical specification has been received from the client or engineering team. Package enters the procurement pipeline." },
    { name: "RFQ Float",               color: "bg-blue-50 text-blue-700",       desc: "Request for Quotation has been issued to shortlisted vendors. Awaiting bids." },
    { name: "Technical Negotiation",   color: "bg-blue-100 text-blue-800",      desc: "Vendor bids are under technical review. Clarifications and exceptions are being resolved." },
    { name: "Commercial Negotiation",  color: "bg-blue-200 text-blue-900",      desc: "Technical scope is aligned. Price and commercial terms are being negotiated." },
    { name: "Award",                   color: "bg-emerald-100 text-emerald-800", desc: "Package has been awarded to a vendor. Award value and vendor are recorded." },
  ];

  return (
    <div>
      <H2>Procurement Stages</H2>
      <p className="text-xs text-slate-400 mb-4">The five-stage lifecycle of a procurement package</p>
      <P>
        Every package moves through five sequential stages. The stage stepper on each package
        detail page lets you advance (or revert) the stage. Advancing to <strong>Award</strong>
        opens a modal to record the award value and winning vendor.
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

      <H3>Awarding a package</H3>
      <ol className="space-y-2 mt-1">
        {[
          "Be in Edit Mode.",
          "Open the package detail page.",
          "Click the 'Award' step in the stage stepper.",
          "In the award modal, enter the final award value and select or type the vendor name.",
          "Click Confirm Award. The stage updates, award value is locked in, and the Billing section becomes available.",
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

      <H3>Editing vendor values</H3>
      <P>
        In Edit Mode, click the edit (pencil) icon next to any vendor row to update the
        quoted or revised amount inline.
      </P>

      <H3>Awarded vendor highlight</H3>
      <P>
        Once a package is awarded, the winning vendor row is highlighted in the matrix with
        a green "Awarded" badge. The award value shown in the table header comes from the
        award modal, not from the revised amount field — they can differ.
      </P>

      <Tip>
        You can have multiple vendors in any stage of the package — not just during negotiation.
        Keeping all bidders lets you reference the competitive landscape later.
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
        section becomes visible on its detail page. You can log invoices here and monitor
        how much of the awarded value has been billed.
      </P>

      <H3>Adding an invoice</H3>
      <ol className="space-y-2 mt-1">
        {[
          "The package must be in the Award stage.",
          "Enable Edit Mode.",
          "Scroll to the Billing section on the package detail page.",
          "Click '+ Add Invoice'.",
          "Enter the invoice amount, invoice number, invoice date, and optional notes.",
          "Click Add Invoice. The invoice appears in the list and the billed total updates.",
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
        <Li><strong>Budget breakdown bar</strong> — on the project page, the dark-blue segment shows the billed portion, emerald shows awarded-but-not-billed</Li>
      </ul>

      <H3>Portfolio-level billing</H3>
      <P>
        The Dashboard's <strong>Total Billed</strong> stat card and the <strong>Billed to Date</strong>
        figure in the Portfolio Summary aggregate billing across all projects.
        The inner ring of the donut chart shows billed as a % of awarded.
      </P>

      <Note>
        Deleting an invoice is permanent. Make sure invoice numbers are correct before saving —
        the invoice number field is for reference only and is not validated for uniqueness.
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
        Budget Analytics panel. It provides a cross-project financial overview.
      </P>

      <H3>Summary cards</H3>
      <ul className="space-y-2 mt-1">
        <Li><strong>Total Budget</strong> — combined budget across all selected projects</Li>
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
        The table at the bottom of the Analytics panel can be sorted by Budget, Committed,
        or Billed by clicking the column headers. The bottom row shows portfolio totals.
      </P>

      <Tip>
        Analytics always reflects live data — no need to refresh. Any award or invoice added
        while the panel is open will appear the next time you open it.
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
        Mode button is hidden for them.
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

      <H3>Edit Mode scope</H3>
      <P>
        Edit Mode is a client-side toggle and is scoped to your current session. It
        persists across navigation within the app but resets if you reload the page.
      </P>

      <Note>
        The API enforces permissions server-side regardless of Edit Mode. Even if Edit Mode
        is somehow activated, write operations will be rejected for users without the correct role.
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
        Admins can manage users from the <strong>Users</strong> button in the dashboard header
        (visible only to admins). Each user has a role and an optional Can Edit permission.
      </P>

      <H3>Roles explained</H3>
      <div className="space-y-3 mt-2">
        {[
          { role: "Admin",  color: "bg-violet-50 border-violet-200", badge: "bg-violet-100 text-violet-700", desc: "Full access. Can manage users, settings, categories, and all project data. Can enter Edit Mode." },
          { role: "User (Can Edit)", color: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-700", desc: "Can view and edit all project data. Cannot manage users or settings." },
          { role: "User (View only)", color: "bg-slate-50 border-slate-200", badge: "bg-slate-100 text-slate-600", desc: "Read-only. Can view all projects, packages, vendors, and invoices but cannot make changes." },
        ].map(r => (
          <div key={r.role} className={`rounded-xl border p-3.5 ${r.color}`}>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.badge} mb-2 inline-block`}>{r.role}</span>
            <P>{r.desc}</P>
          </div>
        ))}
      </div>

      <H3>Adding a user</H3>
      <ol className="space-y-2 mt-1">
        {[
          "Click the 'Users' button in the dashboard header.",
          "In the User Management panel, fill in Username, Full Name, and Password.",
          "Select the role (Admin or User) and toggle 'Can Edit' if needed.",
          "Click Add User. The user can now log in with those credentials.",
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <StepBadge n={i + 1} />
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <H3>Changing permissions</H3>
      <P>
        In the user list, use the Role dropdown and Can Edit toggle to update a user's
        access level immediately. Changes take effect on their next page load.
      </P>

      <Note>
        You cannot delete your own account or demote yourself from Admin while logged in.
      </Note>
    </div>
  );
}

function SectionSettings() {
  return (
    <div>
      <H2>Settings</H2>
      <p className="text-xs text-slate-400 mb-4">Admin-only — customise your organisation profile</p>
      <P>
        Click the gear icon (⚙) in the dashboard header (visible to admins) to open
        Company Settings. Changes here personalise the app for your organisation.
      </P>

      <H3>What you can configure</H3>
      <ul className="space-y-2 mt-1">
        <Li><strong>Company Name</strong> — shown in the header, login page, and footer</Li>
        <Li><strong>Tagline</strong> — a short descriptor shown under the name</Li>
        <Li><strong>Logo URL</strong> — paste a public image URL to replace the default icon</Li>
        <Li><strong>Contact Email</strong> — reference email displayed in the footer</Li>
        <Li><strong>Primary Colour</strong> — reserved for future theming (no visual effect yet)</Li>
      </ul>

      <H3>Category management</H3>
      <P>
        Also inside Settings, the <strong>Categories</strong> tab lets admins add or remove
        global procurement categories. Categories added here become available when creating
        a new package in any project.
      </P>

      <H3>Data tools (admin only)</H3>
      <ul className="space-y-2 mt-1">
        <Li><strong>Seed Data</strong> — loads a sample dataset of 5 projects with 21 packages each for demonstration</Li>
        <Li><strong>Reset Data</strong> — permanently deletes all projects, packages, and related data. Use with caution.</Li>
      </ul>

      <Note>
        Reset Data is irreversible. All projects, packages, vendors, invoices, remarks, and
        documents will be permanently deleted from the database.
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
                <p className="text-[10px] text-slate-400 mt-0.5">12 sections</p>
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
              Procurement Dashboard · Internal Use Only
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
