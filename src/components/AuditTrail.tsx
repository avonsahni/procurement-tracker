"use client";

import { AuditEntry } from "@/lib/types";
import { Activity, Clock } from "lucide-react";

export default function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
        <Activity className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-slate-900 text-sm">Audit Trail</h3>
        <span className="text-xs text-slate-400 ml-1">({entries.length})</span>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-400 text-sm italic">No activity recorded.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.slice().reverse().map((entry) => (
              <div key={entry.id} className="px-5 py-3 hover:bg-slate-50/60 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-blue-700">{entry.user}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" /> {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Updated <span className="font-medium text-slate-800">{entry.field}</span> from
                  <span className="italic px-1 text-slate-500">&ldquo;{entry.oldValue || "empty"}&rdquo;</span> to
                  <span className="font-medium text-blue-700 italic"> &ldquo;{entry.newValue}&rdquo;</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
