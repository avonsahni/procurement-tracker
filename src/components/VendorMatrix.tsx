"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, TrendingDown, X, ChevronDown, ChevronRight } from "lucide-react";
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
  const [showAdd, setShowAdd]       = useState(false);
  const [newV, setNewV]             = useState({ name: "", quoted: "", revised: "" });
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({});
  const [addingRev, setAddingRev]   = useState<Record<string, { amount: string; notes: string } | null>>({});
  const [savingRev, setSavingRev]   = useState<Record<string, boolean>>({});
  const confirm = useConfirm();

  const toggleExpand = (vid: string) =>
    setExpanded(prev => ({ ...prev, [vid]: !prev[vid] }));

  const openRevForm = (vid: string) =>
    setAddingRev(prev => ({ ...prev, [vid]: { amount: "", notes: "" } }));

  const closeRevForm = (vid: string) =>
    setAddingRev(prev => ({ ...prev, [vid]: null }));

  const handleAddRevision = async (vid: string) => {
    const form = addingRev[vid];
    if (!form || !form.amount) return;
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) return;
    setSavingRev(prev => ({ ...prev, [vid]: true }));
    try {
      await onAddRevision(vid, { amount, notes: form.notes });
      closeRevForm(vid);
      setExpanded(prev => ({ ...prev, [vid]: true }));
    } finally {
      setSavingRev(prev => ({ ...prev, [vid]: false }));
    }
  };

  const handleAdd = () => {
    if (!newV.name) return;
    onAdd({
      name: newV.name,
      quoted: parseFloat(newV.quoted) || 0,
      revised: parseFloat(newV.revised) || parseFloat(newV.quoted) || 0
    });
    setNewV({ name: "", quoted: "", revised: "" });
    setShowAdd(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-blue-600" /> Comparison Matrix
        </h3>
        {!readonly && (
          <button type="button" onClick={() => setShowAdd(true)} className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 transition">
            <Plus className="w-3.5 h-3.5" /> Add Vendor
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="px-5 py-3 font-medium text-slate-500 text-xs">Vendor Name</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs text-right">Quoted</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs text-right">Best Offer</th>
              <th className="px-5 py-3 font-medium text-emerald-700 text-xs text-right">Final Awarded</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm italic">No vendors added yet.</td></tr>
            ) : (
              vendors.map((v) => {
                const isWinner     = v.id === awardedVendorId;
                const isAwarded    = !!awardedVendorId;
                const latestRev    = v.revisions && v.revisions.length > 0 ? v.revisions[v.revisions.length - 1] : null;
                const bestOffer    = latestRev ? latestRev.amount : v.revisedAmount;
                const variance     = v.quotedAmount > 0 ? ((v.quotedAmount - bestOffer) / v.quotedAmount) * 100 : 0;
                const isExpanded   = !!expanded[v.id];
                const revForm      = addingRev[v.id] ?? null;
                const isSaving     = !!savingRev[v.id];

                return (
                  <>
                    <tr key={v.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition ${isWinner ? "bg-emerald-50/50" : ""}`}>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {v.revisions && v.revisions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(v.id)}
                              className="text-slate-400 hover:text-slate-700 transition flex-shrink-0"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                          <input
                            value={v.name}
                            onChange={(e) => onUpdate(v.id, { name: e.target.value })}
                            disabled={readonly}
                            className="bg-transparent font-medium text-slate-900 border-none focus:ring-0 flex-1 p-0 outline-none text-sm min-w-0"
                          />
                          {latestRev && (
                            <span className="flex-shrink-0 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-1.5 rounded font-semibold">
                              R{v.revisions.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <input
                          type="number"
                          value={v.quotedAmount}
                          onChange={(e) => onUpdate(v.id, { quotedAmount: parseFloat(e.target.value) || 0 })}
                          disabled={readonly}
                          className="bg-transparent text-right font-mono text-slate-500 border-none focus:ring-0 w-full p-0 outline-none text-sm"
                        />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex flex-col items-end">
                          {latestRev ? (
                            <span className="font-mono font-semibold text-slate-900 text-sm">{formatCurrency(latestRev.amount, currency)}</span>
                          ) : (
                            <input
                              type="number"
                              value={v.revisedAmount}
                              onChange={(e) => onUpdate(v.id, { revisedAmount: parseFloat(e.target.value) || 0 })}
                              disabled={readonly}
                              className="bg-transparent text-right font-mono font-semibold text-slate-900 border-none focus:ring-0 w-full p-0 outline-none text-sm"
                            />
                          )}
                          {variance > 0 && <span className="text-xs text-emerald-600 font-medium mt-0.5">↓ {variance.toFixed(1)}%</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {isWinner ? (
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-mono font-semibold text-emerald-700">{formatCurrency(awardValue || 0, currency)}</span>
                            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 rounded font-medium mt-0.5">Winner</span>
                          </div>
                        ) : (
                          !readonly && onSelectWinner && (
                            <button
                              type="button"
                              onClick={() => onSelectWinner(v)}
                              className="text-xs font-medium text-slate-500 hover:text-emerald-700 flex items-center gap-1 ml-auto transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Select
                            </button>
                          )
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
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

                    {/* Revision history panel */}
                    {isExpanded && v.revisions && v.revisions.length > 0 && (
                      <tr key={`${v.id}-revs`} className="bg-slate-50/70 border-b border-slate-100">
                        <td colSpan={5} className="px-6 py-3">
                          <div className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wide">Negotiation Rounds</div>
                          <div className="space-y-1.5">
                            {v.revisions.map((r, idx) => {
                              const prevAmount = idx > 0 ? v.revisions[idx - 1].amount : v.quotedAmount;
                              const pct = prevAmount > 0 ? ((prevAmount - r.amount) / prevAmount) * 100 : 0;
                              return (
                                <div key={r.id} className="flex items-center gap-3 text-xs">
                                  <span className="w-6 text-center font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1">R{r.roundNumber}</span>
                                  <span className="font-mono font-semibold text-slate-900">{formatCurrency(r.amount, currency)}</span>
                                  {pct > 0 && <span className="text-emerald-600 font-medium">↓ {pct.toFixed(1)}%</span>}
                                  {r.notes && <span className="text-slate-500 italic flex-1 truncate">{r.notes}</span>}
                                  <span className="text-slate-400 ml-auto">{r.createdBy}</span>
                                  {!readonly && !isAwarded && (
                                    <button
                                      type="button"
                                      onClick={async () => { if (await confirm(`Delete R${r.roundNumber}?`)) await onDeleteRevision(v.id, r.id); }}
                                      className="text-slate-300 hover:text-red-500 transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Add revision form / locked message */}
                    {!readonly && (
                      <tr key={`${v.id}-addrev`} className="bg-slate-50/40 border-b border-slate-100">
                        <td colSpan={5} className="px-6 py-2">
                          {isAwarded ? (
                            <p className="text-xs text-slate-400 italic">Package awarded — no further revisions allowed.</p>
                          ) : revForm ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={revForm.amount}
                                onChange={(e) => setAddingRev(prev => ({ ...prev, [v.id]: { ...prev[v.id]!, amount: e.target.value } }))}
                                placeholder="Amount"
                                className="w-32 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                              />
                              <input
                                value={revForm.notes}
                                onChange={(e) => setAddingRev(prev => ({ ...prev, [v.id]: { ...prev[v.id]!, notes: e.target.value } }))}
                                placeholder="Notes (optional)"
                                className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddRevision(v.id)}
                                disabled={isSaving || !revForm.amount}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs font-medium transition"
                              >
                                {isSaving ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => closeRevForm(v.id)}
                                className="text-slate-400 hover:text-slate-700 transition"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openRevForm(v.id)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition"
                            >
                              <Plus className="w-3 h-3" /> Add Revision Round
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Add New Vendor</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Vendor Name</label>
                <input value={newV.name} onChange={(e) => setNewV({ ...newV, name: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" placeholder="e.g. Larsen & Toubro" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Quoted</label>
                  <input type="number" value={newV.quoted} onChange={(e) => setNewV({ ...newV, quoted: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Initial Revised</label>
                  <input type="number" value={newV.revised} onChange={(e) => setNewV({ ...newV, revised: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono" placeholder="0.00" />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={handleAdd} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">Add Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
