"use client";

import { useState } from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { Remark } from "@/lib/types";

interface ProgressRemarksPanelProps {
  remarks: Remark[];
  readonly?: boolean;
  onAddRemark: (text: string) => Promise<void>;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

export default function ProgressRemarksPanel({
  remarks,
  readonly,
  onAddRemark,
}: ProgressRemarksPanelProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sorted = [...remarks].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onAddRemark(text.trim());
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-slate-900 text-sm">Progress Remarks</h3>
        <span className="text-xs text-slate-400 ml-1">({remarks.length})</span>
      </div>

      {/* Add remark form */}
      {!readonly && (
        <form onSubmit={handleSubmit} className="px-5 py-3.5 border-b border-slate-100 flex gap-2 items-center bg-blue-50/40">
          <input
            type="text"
            placeholder="Update progress remarks…"
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={submitting}
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 placeholder-slate-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {submitting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
            {submitting ? "Posting…" : "Post"}
          </button>
        </form>
      )}

      {/* Remarks table */}
      {sorted.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-10 italic">
          No progress remarks yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap w-44">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap w-36">User</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap align-top">
                    {fmtDate(r.timestamp)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="text-xs font-semibold text-blue-700">{r.user}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 leading-relaxed align-top">
                    {r.text}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
