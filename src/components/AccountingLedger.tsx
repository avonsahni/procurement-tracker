"use client";

import { useState, useCallback } from "react";
import {
  ArrowLeft, Receipt, TrendingUp, TrendingDown, BookOpen,
  Download, ArrowRight, FolderOpen, Loader2,
} from "lucide-react";
import { formatCurrency, Currency } from "@/lib/types";
import {
  fetchLedgerProjects, fetchLedgerStatement,
  LedgerType, LedgerProjectRow, LedgerEntry,
} from "@/lib/store";
import { LogoMark } from "@/components/Logo";
import HelpButton from "@/components/HelpButton";
import SiteFooter from "@/components/SiteFooter";

// ── Statement type metadata ──────────────────────────────────────────────────

interface TypeMeta {
  key: LedgerType;
  label: string;            // card title
  statementLabel: string;   // header label when viewing a statement
  description: string;
  icon: typeof Receipt;
  accent: string;           // text colour
  cardBg: string;           // card background / border
  headBg: string;           // table header background
  amountColor: string;
}

const TYPES: TypeMeta[] = [
  {
    key: "billing",
    label: "Billing",
    statementLabel: "Billing Statement",
    description: "All invoices raised across packages",
    icon: Receipt,
    accent: "text-violet-700",
    cardBg: "bg-violet-50 border-violet-200 hover:border-violet-300",
    headBg: "bg-violet-50",
    amountColor: "text-violet-700",
  },
  {
    key: "inflow",
    label: "Cash Inflow Statement",
    statementLabel: "Cash Inflow Statement",
    description: "All receipts recorded against packages",
    icon: TrendingUp,
    accent: "text-emerald-700",
    cardBg: "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
    headBg: "bg-emerald-50",
    amountColor: "text-emerald-700",
  },
  {
    key: "outflow",
    label: "Cash Outflow Statement",
    statementLabel: "Cash Outflow Statement",
    description: "All payments made against packages",
    icon: TrendingDown,
    accent: "text-red-700",
    cardBg: "bg-red-50 border-red-200 hover:border-red-300",
    headBg: "bg-red-50",
    amountColor: "text-red-700",
  },
];

// Column definitions per type — drive both the table and the export.
interface ColumnDef {
  header: string;
  get: (e: LedgerEntry, idx: number) => string | number;
  align?: "left" | "right";
  mono?: boolean;
  isAmount?: boolean;
}

const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function columnsFor(type: LedgerType): ColumnDef[] {
  const common: ColumnDef[] = [
    { header: "#", get: (_e, i) => i + 1, align: "left" },
    { header: "Package", get: (e) => e.package },
  ];
  const amountCol: ColumnDef = { header: "Amount", get: (e) => e.amount, align: "right", mono: true, isAmount: true };
  const userCol: ColumnDef = { header: "User", get: (e) => e.user };

  if (type === "billing") {
    return [
      ...common,
      { header: "Invoice #", get: (e) => e.invoiceNumber || "—", mono: true },
      { header: "Date", get: (e) => fmtDate(e.date) },
      amountCol,
      { header: "Notes", get: (e) => e.notes || "—" },
      userCol,
    ];
  }
  if (type === "inflow") {
    return [
      ...common,
      { header: "On Account Of", get: (e) => e.onAccount || "—" },
      { header: "From Party", get: (e) => e.fromParty || "—" },
      { header: "Date Received", get: (e) => fmtDate(e.date) },
      amountCol,
      { header: "Remarks", get: (e) => e.remarks || "—" },
      userCol,
    ];
  }
  // outflow
  return [
    ...common,
    { header: "To Whom", get: (e) => e.toWhom || "—" },
    { header: "On Account Of", get: (e) => e.onAccountOf || "—" },
    { header: "Date Paid", get: (e) => fmtDate(e.date) },
    amountCol,
    { header: "Remarks", get: (e) => e.remarks || "—" },
    userCol,
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

type Level = "cards" | "projects" | "statement";

export default function AccountingLedger({ onBack }: { onBack: () => void }) {
  const [level, setLevel]     = useState<Level>("cards");
  const [type, setType]       = useState<LedgerType | null>(null);
  const [projects, setProjects] = useState<LedgerProjectRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [project, setProject] = useState<{ id: string; name: string; client: string } | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [exporting, setExporting] = useState(false);

  const meta = TYPES.find(t => t.key === type) || null;

  // Level 1 → 2: open a statement type and load its project list
  const openType = useCallback(async (t: LedgerType) => {
    setType(t);
    setLevel("projects");
    setLoadingProjects(true);
    try {
      setProjects(await fetchLedgerProjects(t));
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // Level 2 → 3: open a project's statement
  const openProject = useCallback(async (p: LedgerProjectRow) => {
    if (!type) return;
    setLevel("statement");
    setLoadingStatement(true);
    setEntries([]);
    setProject({ id: p.id, name: p.name, client: p.client });
    try {
      const data = await fetchLedgerStatement(type, p.id);
      setProject(data.project);
      setEntries(data.entries);
    } catch {
      setEntries([]);
    } finally {
      setLoadingStatement(false);
    }
  }, [type]);

  const goBack = () => {
    if (level === "statement") { setLevel("projects"); setProject(null); setEntries([]); }
    else if (level === "projects") { setLevel("cards"); setType(null); setProjects([]); }
    else onBack();
  };

  const columns = type ? columnsFor(type) : [];
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const currency = (entries[0]?.currency || "INR") as Currency;

  // Export the current statement to XLSX
  const handleExport = async () => {
    if (!meta || !project) return;
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const header = columns.map(c => c.header);
      const rows = entries.map((e, i) => columns.map(c => c.get(e, i)));
      const totalRow = columns.map((c) => (c.isAmount ? total : c.header === "Package" ? "TOTAL" : ""));
      const aoa = [
        [meta.statementLabel],
        [`Project: ${project.name}${project.client ? ` · ${project.client}` : ""}`],
        [`Generated: ${new Date().toLocaleString("en-GB")}`],
        [],
        header,
        ...rows,
        [],
        totalRow,
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = columns.map(c => ({ wch: c.header === "Notes" || c.header === "Remarks" ? 28 : c.header === "Package" ? 26 : 16 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, meta.label.slice(0, 28));
      const safe = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "_");
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `${safe(project.name)}_${meta.key}_${dateStr}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  // Header subtitle reflects what's being displayed
  const headerTitle =
    level === "cards" ? "Accounting Ledger"
    : level === "projects" ? meta?.statementLabel ?? "Accounting Ledger"
    : meta?.statementLabel ?? "Statement";
  const headerSubtitle =
    level === "cards" ? "Billing · Cash Inflow · Cash Outflow"
    : level === "projects" ? "Select a project"
    : project ? `${project.name}${project.client ? ` · ${project.client}` : ""}` : "";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={goBack} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <a href="/" className="hover:opacity-80 transition flex-shrink-0" title="Home">
              <LogoMark size={36} />
            </a>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-slate-900 leading-none truncate">{headerTitle}</h1>
                <p className="text-xs text-slate-500 mt-1 truncate">{headerSubtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {level === "statement" && entries.length > 0 && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white transition disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export
              </button>
            )}
            <HelpButton />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">

        {/* LEVEL 1 — Statement type cards */}
        {level === "cards" && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Accounting Ledger</h2>
              <p className="text-sm text-slate-500 mt-1">Choose a statement to view entries across all projects.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => openType(t.key)}
                    className={`group text-left rounded-2xl border p-6 transition-all duration-200 hover:shadow-md ${t.cardBg}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${t.accent}`} />
                      </div>
                      <ArrowRight className={`w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition ${t.accent}`} />
                    </div>
                    <h3 className={`text-base font-semibold ${t.accent}`}>{t.label}</h3>
                    <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* LEVEL 2 — Project list */}
        {level === "projects" && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">{meta?.statementLabel}</h2>
              <p className="text-sm text-slate-500 mt-1">Select a project to view its statement.</p>
            </div>
            {loadingProjects ? (
              <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading…
              </div>
            ) : projects.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-medium">No projects found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => openProject(p)}
                    className="group text-left bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition truncate">{p.name}</h3>
                        {p.client && <p className="text-xs text-slate-500 mt-0.5 truncate">{p.client}</p>}
                      </div>
                      <div className="p-1.5 rounded-lg border border-slate-200 text-slate-400 group-hover:border-blue-300 group-hover:text-blue-600 transition flex-shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Entries</p>
                        <p className="text-sm font-mono font-semibold text-slate-700">{p.entryCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total</p>
                        <p className={`text-sm font-mono font-semibold ${meta?.amountColor}`}>{formatCurrency(p.total)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* LEVEL 3 — Statement table */}
        {level === "statement" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{meta?.statementLabel}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {project?.name}{project?.client ? ` · ${project.client}` : ""}
                </p>
              </div>
              {entries.length > 0 && (
                <div className="text-right bg-white border border-slate-200 rounded-xl px-4 py-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total · {entries.length} {entries.length === 1 ? "entry" : "entries"}</p>
                  <p className={`text-base font-mono font-bold ${meta?.amountColor}`}>{formatCurrency(total, currency)}</p>
                </div>
              )}
            </div>

            {loadingStatement ? (
              <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading statement…
              </div>
            ) : entries.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-medium">No entries recorded for this project</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {/* Scrollable table window */}
                <div className="overflow-auto max-h-[calc(100vh-300px)]">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className={meta?.headBg}>
                        {columns.map((c, i) => (
                          <th
                            key={i}
                            className={`px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"}`}
                          >
                            {c.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.map((e, idx) => (
                        <tr key={e.id} className="hover:bg-slate-50/60 transition">
                          {columns.map((c, ci) => {
                            const val = c.get(e, idx);
                            const display = c.isAmount ? formatCurrency(Number(val), e.currency as Currency) : String(val);
                            return (
                              <td
                                key={ci}
                                className={`px-4 py-3 whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"} ${
                                  c.isAmount ? `font-mono font-semibold ${meta?.amountColor}` : c.mono ? "font-mono text-slate-600" : "text-slate-700"
                                }`}
                              >
                                {display}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0">
                      <tr className="bg-slate-100 border-t border-slate-200">
                        {columns.map((c, i) => (
                          <td key={i} className={`px-4 py-3 text-xs font-bold ${c.align === "right" ? "text-right" : "text-left"} ${c.isAmount ? `font-mono ${meta?.amountColor}` : "text-slate-600"}`}>
                            {c.isAmount ? formatCurrency(total, currency) : c.header === "Package" ? "TOTAL" : ""}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
