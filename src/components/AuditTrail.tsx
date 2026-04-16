"use client";

import { AuditEntry } from "@/lib/types";
import { Activity, Clock } from "lucide-react";

export default function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Activity className="w-4 h-4 text-indigo-600" />
        <h3 className="font-semibold text-gray-900 text-sm">Audit Trail</h3>
        <span className="text-xs text-gray-400 ml-1">({entries.length})</span>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-5 py-6 text-center text-gray-400 text-sm">No activity recorded.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {entries.slice().reverse().map((entry) => (
              <div key={entry.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-900">{entry.user}</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Clock className="w-3 h-3" /> {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Updated <span className="font-medium text-gray-800">{entry.field}</span> from 
                  <span className="italic px-1 text-gray-400">"{entry.oldValue || "empty"}"</span> to 
                  <span className="font-medium text-blue-600 italic">"{entry.newValue}"</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
