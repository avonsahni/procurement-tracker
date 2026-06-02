"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, TrendingDown, X } from "lucide-react";
import { formatCurrency, Currency, Vendor, VendorRevision } from "@/lib/types";
import { useConfirm } from "@/components/ConfirmDialog";

interface VendorMatrixProps {
  vendors: Vendor[];
  currency: Currency;
  onAdd: (v: { name: string; quoted: number; revised: number }) => void;
  onDelete: (vid: string) => void;
  onUpdate: (vid: string, updates: Partial<Pick<Vendor, 'name' | 'quotedAmount' | 'revisedAmount'>>) => void;
  onAddRevision: (vid: string, data: { amount: number; notes: string }) => Promise<VendorRevision>;
  onDeleteRevision: (vid: string, rid: string) => Promise<void>;
  awardedVendorId?: string;
  awardValue?: number;
  onSelectWinner?: (v: Vendor) => void;
  readonly?: boolean;
}

export default function VendorMatrix({
  vendors, currency, onAdd, onDelete, onUpdate,
  onAddRevision, onDeleteRevision,
  awardedVendorId, awardValue, onSelectWinner, readonly,
}: VendorMatrixProps) {
  const confirm = useConfirm();

  // R-columns: one per actual data round, plus one pending column when the user
  // clicks "+ Add Revision Round". The pending column disappears automatically
  // once any vendor saves a value in it (maxFromData grows) — so empty columns
  // never persist after a reload or navigation.
  const maxFromData = vendors.reduce((m, v) => Math.max(m, v.revisions.length), 0);
  const [pendingCol, setPendingCol] = useState(false);
  useEffect(() => { setPendingCol(false); }, [maxFromData]);
  const totalCols = maxFromData + (pendingCol ? 1 : 0);

  // Per-cell draft amounts keyed by `${vendorId}-${colIndex}`
  const [cellDrafts, setCellDrafts]   = useState<Record<string, string>>({});
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});

  // New-vendor modal
  const [showAdd, setShowAdd] = useState(false);
  const [newV, setNewV]       = useState({ name: "", quoted: "", revised: "" });

  const isAwarded = !!awardedVendorId;

  const saveCell = async (vid: string, cellKey: string) => {
    const val = parseFloat(cellDrafts[cellKey] || "");
    if (isNaN(val) || val <= 0) return;
    setSavingCells(prev => ({ ...prev, [cellKey]: true }));
    try {
      await onAddRevision(vid, { amount: val, notes: "" });
      setCellDrafts(prev => { const n = { ...prev }; delete n[cellKey]; return n; });
    } finally {
      setSavingCells(prev => ({ ...prev, [cellKey]: false }));
    }
  };

  const handleAdd = () => {
    if (!newV.name) return;
    onAdd({
      name:    newV.name,
      quoted:  parseFloat(newV.quoted)  || 0,
      revised: parseFloat(newV.revised) || parseFloat(newV.quoted) || 0,
    });
    setNewV({ name: "", quoted: "", revised: "" });
    setShowAdd(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-blue-600" /> Comparison Matrix
        </h3>
        {!readonly && (
          <div className="flex items-center gap-4">
            {!isAwarded && (
              <button
                type="button"
                onClick={() => setPendingCol(true)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Revision Round
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Vendor
            </button>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="px-5 py-3 font-medium text-slate-500 text-xs">Vendor</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-xs text-right whitespace-nowrap">Quoted</th>
              {Array.from({ length: totalCols }).map((_, i) => (
                <th key={i} className="px-4 py-3 font-medium text-blue-700 text-xs text-right whitespace-nowrap">
                  R{i + 1}
                </th>
              ))}
              <th className="px-4 py-3 font-medium text-emerald-700 text-xs text-right whitespace-nowrap">Final Awarded</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={3 + totalCols} className="px-5 py-8 text-center text-slate-400 text-sm italic">
                  No vendors added yet.
                </td>
              </tr>
            ) : vendors.map((v) => {
              const isWinner = v.id === awardedVendorId;
              return (
                <tr
                  key={v.id}
                  className={`border-b border-slate-100 transition ${isWinner ? "bg-emerald-50/50" : "hover:bg-slate-50/50"}`}
                >
                  {/* Vendor name */}
                  <td className="px-5 py-3.5">
                    <input
                      value={v.name}
                      onChange={(e) => onUpdate(v.id, { name: e.target.value })}
                      disabled={readonly}
                      className="bg-transparent font-medium text-slate-900 border-none focus:ring-0 w-full p-0 outline-none text-sm disabled:cursor-default"
                    />
                  </td>

                  {/* Quoted */}
                  <td className="px-4 py-3.5 text-right">
                    <input
                      type="number"
                      value={v.quotedAmount}
                      onChange={(e) => onUpdate(v.id, { quotedAmount: parseFloat(e.target.value) || 0 })}
                      disabled={readonly}
                      className="bg-transparent text-right font-mono text-slate-500 border-none focus:ring-0 w-full p-0 outline-none text-sm disabled:cursor-default"
                    />
                  </td>

                  {/* Revision columns */}
                  {Array.from({ length: totalCols }).map((_, colIdx) => {
                    const rev      = v.revisions[colIdx];
                    const cellKey  = `${v.id}-${colIdx}`;
                    const isSaving = !!savingCells[cellKey];
                    const prevAmt  = colIdx === 0 ? v.quotedAmount : (v.revisions[colIdx - 1]?.amount ?? null);

                    if (rev) {
                      const pct = prevAmt && prevAmt > 0 ? ((prevAmt - rev.amount) / prevAmt) * 100 : null;
                      return (
                        <td key={colIdx} className="px-4 py-3.5 text-right">
                          <div className="relative group inline-flex flex-col items-end">
                            <span className="font-mono font-semibold text-slate-900 text-sm whitespace-nowrap">
                              {formatCurrency(rev.amount, currency)}
                            </span>
                            {pct !== null && pct > 0 && (
                              <span className="text-xs text-emerald-600 font-medium">↓ {pct.toFixed(1)}%</span>
                            )}
                            {!readonly && !isAwarded && (
                              <button
                                type="button"
                                title={`Delete R${colIdx + 1}`}
                                onClick={async () => {
                                  if (await confirm(`Delete R${colIdx + 1} for ${v.name}?`))
                                    await onDeleteRevision(v.id, rev.id);
                                }}
                                className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center bg-red-100 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    }

                    // Empty cell
                    if (readonly) {
                      return (
                        <td key={colIdx} className="px-4 py-3.5 text-right font-mono text-slate-300 text-sm">—</td>
                      );
                    }

                    return (
                      <td key={colIdx} className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            value={cellDrafts[cellKey] || ""}
                            onChange={(e) => setCellDrafts(prev => ({ ...prev, [cellKey]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") saveCell(v.id, cellKey); }}
                            disabled={isSaving}
                            placeholder="—"
                            className="w-28 text-right font-mono text-xs bg-slate-50 border border-dashed border-slate-300 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-50 placeholder-slate-300"
                          />
                          {cellDrafts[cellKey] && (
                            <button
                              type="button"
                              onClick={() => saveCell(v.id, cellKey)}
                              disabled={isSaving}
                              className="text-emerald-600 hover:text-emerald-700 font-bold text-base leading-none px-1 transition disabled:opacity-50"
                            >
                              {isSaving ? "…" : "✓"}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Final Awarded */}
                  <td className="px-4 py-3.5 text-right">
                    {isWinner ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {formatCurrency(awardValue || 0, currency)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Awarded
                        </span>
                      </div>
                    ) : isAwarded ? (
                      <span className="text-slate-300 font-mono text-sm">—</span>
                    ) : (
                      !readonly && onSelectWinner && (
                        <button
                          type="button"
                          onClick={() => onSelectWinner(v)}
                          className="text-xs font-medium text-slate-400 hover:text-emerald-700 flex items-center gap-1 ml-auto transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Select
                        </button>
                      )
                    )}
                  </td>

                  {/* Delete vendor */}
                  <td className="px-4 py-3.5 text-right">
                    {!readonly && (
                      <button
                        type="button"
                        onClick={async () => { if (await confirm("Delete this vendor?")) onDelete(v.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
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

      {/* ── Add Vendor Modal ───────────────────────────────────────────────── */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Add New Vendor</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Vendor Name</label>
                <input
                  value={newV.name}
                  onChange={(e) => setNewV({ ...newV, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  placeholder="e.g. Larsen & Toubro"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Quoted</label>
                  <input
                    type="number"
                    value={newV.quoted}
                    onChange={(e) => setNewV({ ...newV, quoted: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Initial Revised</label>
                  <input
                    type="number"
                    value={newV.revised}
                    onChange={(e) => setNewV({ ...newV, revised: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleAdd}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
