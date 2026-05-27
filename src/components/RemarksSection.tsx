"use client";

import { useState } from "react";
import { MessageSquare, Send, Trash2, Edit2, Check, X } from "lucide-react";
import { Remark } from "@/lib/types";

interface RemarksSectionProps {
  remarks: Remark[];
  onAddRemark: (text: string) => void;
  onDeleteRemark?: (id: string) => Promise<void>;
  onEditRemark?: (id: string, text: string) => Promise<void>;
  currentUserId?: string;
  isAdmin?: boolean;
  readonly?: boolean;
}

export default function RemarksSection({
  remarks,
  onAddRemark,
  onDeleteRemark,
  onEditRemark,
  currentUserId,
  isAdmin,
  readonly,
}: RemarksSectionProps) {
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddRemark(text.trim());
    setText("");
  };

  const startEdit = (remark: Remark) => {
    setEditingId(remark.id);
    setEditText(remark.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleEdit = async (id: string) => {
    if (!editText.trim() || !onEditRemark) return;
    setBusyId(id);
    try {
      await onEditRemark(id, editText.trim());
      setEditingId(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteRemark) return;
    if (!confirm("Delete this remark? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await onDeleteRemark(id);
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
        <MessageSquare className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-slate-900 text-sm">Remarks & Notes</h3>
        <span className="text-xs text-slate-400 ml-1">({remarks.length})</span>
      </div>

      <div className="flex-1 max-h-[300px] overflow-y-auto p-4 space-y-3">
        {remarks.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8 italic">
            No remarks posted yet.
          </div>
        ) : (
          remarks.map((remark) => {
            const isOwner = !!currentUserId && remark.userId === currentUserId;
            const canEdit   = isOwner && !!onEditRemark;
            const canDelete = (isOwner || isAdmin) && !!onDeleteRemark;
            const isBusy    = busyId === remark.id;

            return (
              <div
                key={remark.id}
                className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100 group"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium text-blue-700">{remark.user}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">{formatDate(remark.timestamp)}</span>
                  </div>

                  {/* Action buttons — visible on hover */}
                  {!readonly && (canEdit || canDelete) && editingId !== remark.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {canEdit && (
                        <button
                          onClick={() => startEdit(remark)}
                          disabled={isBusy}
                          title="Edit remark"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(remark.id)}
                          disabled={isBusy}
                          title="Delete remark"
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline edit mode */}
                {editingId === remark.id ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEdit(remark.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      className="flex-1 bg-white border border-blue-300 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-900"
                    />
                    <button
                      onClick={() => handleEdit(remark.id)}
                      disabled={isBusy || !editText.trim()}
                      title="Save"
                      className="p-1 text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      title="Cancel"
                      className="p-1 text-slate-500 hover:bg-slate-200 rounded transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed">{remark.text}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {!readonly && (
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2">
          <input
            type="text"
            placeholder="Add internal remark..."
            value={text}
            onChange={e => setText(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
