# ProcureTrack — Functional Overview

---

## What It Is

ProcureTrack is a multi-tenant SaaS procurement and execution tracking platform built for engineering and infrastructure project teams. It replaces spreadsheets and status meetings with a single, structured dashboard — covering the full lifecycle of every procurement package from initial specification through on-site delivery and handover.

---

## Core Concepts

**Organisation** — Each company registers as an isolated tenant. All data (projects, packages, users, settings) is fully private and separated from other organisations.

**Project** — A top-level programme (e.g. "Hyperion Data Centre"). Each project has a total budget and contains one or more procurement packages.

**Package** — The fundamental unit. A package is a single scope item (e.g. "UPS & Power Distribution"). It moves through two parallel flows: Purchasing and Execution.

---

## The Two Flows

### 1. Purchasing Flow

Tracks the procurement lifecycle from specification to contract award.

**Five sequential stages:**

| # | Stage | Meaning |
|---|-------|---------|
| 1 | Spec Received | Technical specification in hand; package enters the pipeline |
| 2 | RFQ Float | Request for Quotation issued to vendors |
| 3 | Technical Negotiation | Vendor bids under technical review |
| 4 | Commercial Negotiation | Price and contract terms being finalised |
| 5 | Award | Package awarded; contract value locked; billing unlocked |

The stage stepper on each package page lets editors advance or revert stages. Awarding a package requires selecting a vendor and entering a final award value, which is then tracked against the project budget.

### 2. Execution Flow

Tracks on-site delivery progress after award, using six standard milestones:

| # | Milestone | Meaning |
|---|-----------|---------|
| 1 | Mobilisation | Site access, team deployment |
| 2 | Preliminaries | Temporary works, enabling works |
| 3 | Procurement | Materials and subcontractor orders |
| 4 | Installation | Physical installation underway |
| 5 | Testing & Commissioning | Tests, punch-list clearance, sign-off |
| 6 | Handover | Final documentation, scope delivered |

Each milestone is broken into **subtasks**. Milestone progress auto-computes as the average of its subtask completion percentages — it is never set manually.

---

## Milestone Task Tracking

Subtasks are the core unit of execution progress. Each task has:

- A **name**
- A **start date** and **end date** (both required — a task cannot be created or progressed without them; end date must be after start date)
- A **drag-bar progress** percentage (0–100%)

**Date roll-up chain:**

| Level | What is shown |
|-------|---------------|
| Milestone header | Earliest task start → latest task end across all its tasks |
| Package header | Overall execution timeline for that package |
| Project execution dashboard | Full project date span and per-package date chips |

This gives every level of the organisation — from site manager to project director — an instant view of the delivery timeline without manual entry at each level.

---

## Package Detail

Each package page contains:

### Purchasing Tab
- Package info (category, origin, currency, lead time)
- Procurement Timeline — interactive stage stepper
- Vendor Matrix — all bidders with quoted and revised amounts; awarded vendor highlighted
- Remarks — timestamped free-text notes
- Documents — file reference log
- Billing — invoice list (unlocked at Award stage)
- Audit Trail — full change history

### Execution Tab
- Execution Milestones tracker with subtask management
- Progress Remarks — execution-specific notes

---

## Financial Tracking

- **Award Value** — recorded at the time of award per package
- **Billed Amount** — sum of all invoices logged against an awarded package
- **Budget utilisation** — project budget vs total awarded vs total billed, with over-budget warnings
- **Portfolio Summary** — dashboard-level aggregation: Available Capital, Awarded Rate, Billed to Date, Billing Rate, Milestone Progress
- **Dual-ring donut chart** — outer ring = awarded/budget; inner ring = billed/awarded

---

## Dashboard & Analytics

### Main Dashboard
- Portfolio Summary card with financial KPIs and donut chart
- Expandable stat cards (Active Projects, Total Packages, Total Budget, Awarded Pipeline, Total Billed) — each expands to show a per-project breakdown
- Procurement Pipeline bar — stage distribution across all packages
- Execution Tracking card — milestone completion across all packages
- Project Portfolio grid — all projects with budget bars and quick access

### Budget Analytics Panel
- Cross-project financial overview (Budget / Committed / Billed)
- Per-project three-bar breakdown
- Sortable table with portfolio totals

### Project Execution Dashboard
- Per-package execution cards showing milestone progress, financial %, award value, billed amount, and execution date range
- Project-level date range header
- Filterable by category and search

---

## User Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **Owner** | Full access; created on registration; cannot be removed unless another Owner is first assigned |
| **Admin** | Full project and user management access |
| **Editor** | Can create and update packages, vendors, invoices, milestones, and tasks |
| **Viewer** | Read-only access to all data |

**Edit Mode** is a deliberate gate — the app is read-only by default. Editors and admins must explicitly toggle Edit Mode to make changes. The Execution view auto-enables Edit Mode.

---

## Admin Panel

Accessible to owners and admins:

| Tab | Function |
|-----|----------|
| Overview | Usage summary — project count, package count, member count |
| Users | Invite members, change roles, remove users |
| Branding | Company name, tagline, logo URL, contact email |
| Categories | Manage global procurement disciplines |
| Audit Log | Organisation-wide change history |
| Export | Full data export (available even when plan has lapsed) |
| Danger Zone | Load sample data or wipe all data |

---

## Subscription & Plans

Organisations run on a subscription plan (Trial / Small Teams / Teams). If a plan lapses:

- The entire org enters **read-only mode** — no edits, no deletes
- All data is fully preserved
- Admins can still export data
- Edit Mode is disabled for all users until the plan is renewed

Billing is handled via **Razorpay** with webhook-driven subscription verification.

---

## Multi-Tenancy & Security

- Each organisation's data is isolated at the database level via Row-Level Security (RLS)
- Server-side API routes enforce role checks independently of the UI
- Admin client (service-role key) is used server-side for privileged operations; user-authenticated client is used everywhere else
- Sessions are not persisted after the browser is closed

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 App Router, React, Tailwind CSS |
| Backend | Next.js API routes (server-side, role-guarded) |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| Auth | Supabase Auth (JWT) |
| Payments | Razorpay subscriptions + webhooks |
| Deployment | Vercel |
