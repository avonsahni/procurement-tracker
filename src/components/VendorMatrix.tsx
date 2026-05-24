"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, TrendingDown, X } from "lucide-react";
import { formatCurrency, Currency } from "@/lib/types";

interface VendorMatrixProps {
  vendors: any[];
  currency: Currency;
  onAdd: (v: any) => void;
  onDelete: (vid: string) => void;
  onUpdate: (vid: string, updates: any) => void;
  awardedVendorId?: string;
  awardValue?: number;
  onSelectWinner?: (v: any) => void;
  readonly?: boolean;
}

export default function VendorMatrix({
  vendors,
  currency,
  onAdd,
  onDelete,
  onUpdate,
  awardedVendorId,
  awardValue,
  onSelectWinner,
  readonly
}: VendorMatrixProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newV, setNewV] = useState({ name: "", quoted: "", revised: "" });

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
          <button onClick={() => setShowAdd(true)} className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 transition">
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
              <th className="px-5 py-3 font-medium text-slate-500 text-xs text-right">Revised</th>
              <th className="px-5 py-3 font-medium text-emerald-700 text-xs text-right">Final Awarded</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm italic">No vendors added yet.</td></tr>
            ) : (
              vendors.map((v) => {
                const isWinner = v.name === awardedVendorId;
                const variance = v.quotedAmount > 0 ? ((v.quotedAmount - v.revisedAmount) / v.quotedAmount) * 100 : 0;

                return (
                  <tr key={v.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition ${isWinner ? "bg-emerald-50/50" : ""}`}>
                    <td className="px-5 py-3.5">
                      <input
                        value={v.name}
                        onChange={(e) => onUpdate(v.id, { name: e.target.value })}
                        disabled={readonly}
                        className="bg-transparent font-medium text-slate-900 border-none focus:ring-0 w-full p-0 outline-none text-sm"
                      />
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
                        <input
                          type="number"
                          value={v.revisedAmount}
                          onChange={(e) => onUpdate(v.id, { revisedAmount: parseFloat(e.target.value) || 0 })}
                          disabled={readonly}
                          className="bg-transparent text-right font-mono font-semibold text-slate-900 border-none focus:ring-0 w-full p-0 outline-none text-sm"
                        />
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
                            onClick={() => onSelectWinner(v)}
                            className="text-xs font-medium text-slate-500 hover:text-emerald-700 flex items-center gap-1 ml-auto transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Select
                          </button>
                        )
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {!readonly && <button onClick={() => onDelete(v.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>}
                    </td>
                  </tr>
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
              <button onClick={() => setShowAdd(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"><X className="w-4 h-4" /></button>
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
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Revised</label>
                  <input type="number" value={newV.revised} onChange={(e) => setNewV({ ...newV, revised: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono" placeholder="0.00" />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={handleAdd} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">Add Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
