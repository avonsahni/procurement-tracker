"use client";

import { useState } from "react";
import { Receipt, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Invoice, Currency, formatCurrency } from "@/lib/types";
import { useConfirm } from "@/components/ConfirmDialog";

interface BillingSectionProps {
  invoices: Invoice[];
  awardValue: number;
  currency: Currency;
  onAddInvoice: (inv: { amount: number; invoiceNumber: string; invoiceDate: string; notes: string }) => Promise<void>;
  onDeleteInvoice: (iid: string) => Promise<void>;
  readonly?: boolean;
}

export default function BillingSection({
  invoices,
  awardValue,
  currency,
  onAddInvoice,
  onDeleteInvoice,
  readonly,
}: BillingSectionProps) {
  const [showAdd, setShowAdd] = useState(false);
  const confirm = useConfirm();
  const [amount, setAmount] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const remaining = Math.max(0, awardValue - totalInvoiced);
  const pct = awardValue > 0 ? Math.min(100, (totalInvoiced / awardValue) * 100) : 0;
  const overbilled = totalInvoiced > awardValue && awardValue > 0;
  const fullyBilled = !overbilled && awardValue > 0 && totalInvoiced >= awardValue;

  // Warn in-modal if the entered amount would exceed remaining
  const enteredAmt = parseFloat(amount) || 0;
  const wouldExceedAward = awardValue > 0 && enteredAmt > remaining;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setInvoiceError(null);
    setSubmitting(true);
    try {
      await onAddInvoice({
        amount: amt,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
        notes: notes.trim(),
      });
      setAmount(""); setInvoiceNumber(""); setNotes("");
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setShowAdd(false);
    } catch (e: any) {
      setInvoiceError(e.message || "Failed to record invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Billing</h3>
          <span className="text-xs text-slate-400 ml-1">({invoices.length})</span>
        </div>
        {!readonly && !overbilled && !fullyBilled && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Record Invoice
          </button>
        )}
      </div>

      {/* Progress summary */}
      <div className="px-5 pt-4 pb-2 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Invoiced vs Awarded</span>
          {overbilled ? (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <AlertTriangle className="w-3 h-3" /> {pct.toFixed(1)}% — over awarded value
            </span>
          ) : fullyBilled ? (
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Fully billed
            </span>
          ) : (
            <span className="text-slate-700 font-medium">{pct.toFixed(1)}%</span>
          )}
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overbilled ? "bg-red-500" : fullyBilled ? "bg-emerald-500" : "bg-blue-600"
            }`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 pt-1">
          <div>
            <p className="text-[10px] text-slate-500">Invoiced</p>
            <p className="text-sm font-mono font-semibold text-slate-900">{formatCurrency(totalInvoiced, currency)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Awarded</p>
            <p className="text-sm font-mono font-semibold text-slate-700">{formatCurrency(awardValue, currency)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Remaining</p>
            <p className={`text-sm font-mono font-semibold ${overbilled ? "text-red-600" : "text-emerald-700"}`}>
              {overbilled ? "−" : ""}{formatCurrency(overbilled ? totalInvoiced - awardValue : remaining, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Invoice list */}
      <div className="max-h-[280px] overflow-y-auto mt-2">
        {invoices.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-400 text-sm italic">No invoices recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.slice().reverse().map((inv) => (
              <div key={inv.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/60 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-semibold text-slate-900">{formatCurrency(inv.amount, currency)}</span>
                    {inv.invoiceNumber && (
                      <span className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">
                        #{inv.invoiceNumber}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{formatDate(inv.invoiceDate)}</span>
                  </div>
                  {inv.notes && <p className="text-xs text-slate-500 mt-1 truncate">{inv.notes}</p>}
                  <p className="text-[10px] text-slate-400 mt-0.5">by {inv.user}</p>
                </div>
                {!readonly && (
                  <button
                    onClick={async () => { if (await confirm("Delete this invoice? This cannot be undone.")) onDeleteInvoice(inv.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add-invoice modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowAdd(false); setInvoiceError(null); }}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6"
          >
            <h2 className="text-base font-semibold text-slate-900 mb-1">Record Invoice</h2>

            {/* Remaining billable */}
            <div className={`flex items-center justify-between rounded-lg px-3 py-2 mb-4 text-xs ${
              fullyBilled
                ? "bg-amber-50 border border-amber-200 text-amber-700"
                : "bg-blue-50 border border-blue-200 text-blue-700"
            }`}>
              <span>Remaining billable (this package)</span>
              <span className="font-mono font-semibold">
                {fullyBilled ? "Fully billed" : formatCurrency(remaining, currency)}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Amount ({currency}) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setInvoiceError(null); }}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 font-mono transition ${
                    wouldExceedAward
                      ? "border-red-400 focus:ring-red-400/30 focus:border-red-500"
                      : "border-slate-200 focus:ring-blue-500/30 focus:border-blue-500"
                  }`}
                  placeholder="0.00"
                  autoFocus
                />
                {wouldExceedAward && (
                  <p className="text-xs text-red-600 mt-1.5">
                    ⚠ Exceeds remaining award value by {formatCurrency(enteredAmt - remaining, currency)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Invoice # (optional)</label>
                  <input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-slate-400"
                    placeholder="INV-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-slate-400 resize-none"
                  placeholder="Milestone 1 progress payment"
                />
              </div>
            </div>

            {/* Server error */}
            {invoiceError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {invoiceError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowAdd(false); setInvoiceError(null); }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || wouldExceedAward}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition">
                Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
