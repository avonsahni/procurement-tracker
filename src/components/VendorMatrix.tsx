"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, TrendingDown } from "lucide-react";
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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-widest">
          <TrendingDown className="w-4 h-4 text-blue-600" /> Comparison Matrix
        </h3>
        {!readonly && (
          <button onClick={() => setShowAdd(true)} className="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1 transition-all">
            <Plus className="w-3.5 h-3.5" /> Add Vendor
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              <th className="px-5 py-4 font-bold text-gray-500 uppercase tracking-tighter text-[10px]">Vendor Name</th>
              <th className="px-5 py-4 font-bold text-gray-500 uppercase tracking-tighter text-[10px] text-right">Quoted Amount</th>
              <th className="px-5 py-4 font-bold text-gray-500 uppercase tracking-tighter text-[10px] text-right">Revised Amount</th>
              <th className="px-5 py-4 font-bold text-gray-500 uppercase tracking-tighter text-[10px] text-right text-emerald-600">Final Awarded</th>
              <th className="px-5 py-4 font-bold text-gray-500 uppercase tracking-tighter text-[10px]"></th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 italic">No vendors added yet.</td></tr>
            ) : (
              vendors.map((v) => {
                const isWinner = v.name === awardedVendorId; 
                const variance = ((v.quotedAmount - v.revisedAmount) / v.quotedAmount) * 100;
                
                return (
                  <tr key={v.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isWinner ? "bg-emerald-50/20" : ""}`}>
                    <td className="px-5 py-4">
                      <input 
                        value={v.name} 
                        onChange={(e) => onUpdate(v.id, { name: e.target.value })}
                        disabled={readonly}
                        className="bg-transparent font-bold text-gray-900 border-none focus:ring-0 w-full p-0"
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <input 
                        type="number"
                        value={v.quotedAmount} 
                        onChange={(e) => onUpdate(v.id, { quotedAmount: parseFloat(e.target.value) || 0 })}
                        disabled={readonly}
                        className="bg-transparent text-right font-mono text-gray-500 border-none focus:ring-0 w-full p-0"
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <input 
                          type="number"
                          value={v.revisedAmount} 
                          onChange={(e) => onUpdate(v.id, { revisedAmount: parseFloat(e.target.value) || 0 })}
                          disabled={readonly}
                          className="bg-transparent text-right font-bold text-gray-900 font-mono border-none focus:ring-0 w-full p-0"
                        />
                        {variance > 0 && <span className="text-[9px] text-emerald-600 font-bold">↓ {variance.toFixed(1)}%</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {isWinner ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(awardValue || 0, currency)}</span>
                          <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black uppercase">Winner</span>
                        </div>
                      ) : (
                        !readonly && onSelectWinner && (
                          <button 
                            onClick={() => onSelectWinner(v)}
                            className="text-[10px] font-bold text-gray-400 hover:text-emerald-600 flex items-center gap-1 ml-auto"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Select
                          </button>
                        )
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {!readonly && <button onClick={() => onDelete(v.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-5">Add New Vendor</h2>
            <div className="space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Vendor Name</label><input value={newV.name} onChange={(e) => setNewV({ ...newV, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none" autoFocus /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Quoted</label><input type="number" value={newV.quoted} onChange={(e) => setNewV({ ...newV, quoted: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Revised</label><input type="number" value={newV.revised} onChange={(e) => setNewV({ ...newV, revised: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none" /></div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Cancel</button>
              <button onClick={handleAdd} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200">Add Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
