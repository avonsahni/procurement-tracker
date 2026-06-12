"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { postMessageAction } from "./actions";
import SubmitButton from "./submit-button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { OrgMember } from "@/lib/communication/queries";

export type { OrgMember };

const MAX_DROPDOWN = 6;
const TYPING_BROADCAST_THROTTLE_MS = 1500; // min ms between broadcast events

export default function ComposeBox({
  threadId,
  channelId,
  members,
  currentUserId,
  currentUserName,
}: {
  threadId: string;
  channelId: string;
  members: OrgMember[];
  currentUserId: string;
  currentUserName: string;
}) {
  const [body, setBody] = useState("");
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [dropIdx, setDropIdx] = useState(0);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingBroadcast = useRef<number>(0);
  const typingChannelRef = useRef<ReturnType<
    ReturnType<typeof createBrowserSupabase>["channel"]
  > | null>(null);

  // Subscribe to the typing broadcast channel (send-only; TypingIndicator reads it)
  useEffect(() => {
    const supabase = createBrowserSupabase();
    const ch = supabase.channel(`typing:${threadId}`);
    ch.subscribe();
    typingChannelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
    };
  }, [threadId]);

  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingBroadcast.current < TYPING_BROADCAST_THROTTLE_MS) return;
    lastTypingBroadcast.current = now;
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId, full_name: currentUserName },
    });
  }, [currentUserId, currentUserName]);

  const filtered =
    query !== null
      ? members
          .filter((m) =>
            m.full_name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, MAX_DROPDOWN)
      : [];

  function syncQuery(val: string, cursorPos: number) {
    const before = val.slice(0, cursorPos);
    const m = before.match(/@([^@\s]*)$/);
    if (m) {
      setQuery(m[1]);
      setDropIdx(0);
    } else {
      setQuery(null);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setBody(val);
    syncQuery(val, e.target.selectionStart ?? val.length);
    if (val.trim()) broadcastTyping();
  }

  function pickMember(member: OrgMember) {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart ?? body.length;
    const before = body.slice(0, pos);
    const atIdx = before.lastIndexOf("@");
    const after = body.slice(pos);
    const token = `@${member.full_name} `;
    const newBody = body.slice(0, atIdx) + token + after;
    setBody(newBody);
    setQuery(null);
    setMentionedIds((prev) =>
      prev.includes(member.id) ? prev : [...prev, member.id]
    );
    setTimeout(() => {
      if (ta) {
        const c = atIdx + token.length;
        ta.focus();
        ta.setSelectionRange(c, c);
      }
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query === null || filtered.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setDropIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setDropIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        pickMember(filtered[dropIdx]);
        break;
      case "Escape":
        setQuery(null);
        break;
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 10 * 1024 * 1024) {
      alert("File is too large. Maximum 10 MB per attachment.");
      e.target.value = "";
      return;
    }
    setAttachedFile(f);
  }

  return (
    <form action={postMessageAction} className="flex flex-col gap-2">
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="channelId" value={channelId} />
      <input
        type="hidden"
        name="mentionedUserIds"
        value={JSON.stringify(mentionedIds)}
      />
      {/* Hidden file input driven by the paperclip button */}
      <input
        ref={fileInputRef}
        type="file"
        name="attachment"
        className="hidden"
        onChange={handleFileChange}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
      />

      {/* Attachment preview strip */}
      {attachedFile && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs">
          <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="flex-1 truncate text-blue-700">{attachedFile.name}</span>
          <span className="text-blue-400 shrink-0">
            {(attachedFile.size / 1024).toFixed(0)} KB
          </span>
          <button
            type="button"
            onClick={() => {
              setAttachedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="text-blue-400 hover:text-blue-600 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex gap-3 items-end relative">
        {/* @mention dropdown — floats above the textarea */}
        {query !== null && filtered.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100">
              Mention a person
            </p>
            {filtered.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickMember(m);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition ${
                  idx === dropIdx ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-700">
                    {m.full_name[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-slate-800 truncate">{m.full_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Paperclip / attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach a file"
          className="p-2.5 border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          ref={textareaRef}
          name="body"
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          required
          rows={2}
          placeholder="Write a message… type @ to mention someone"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
        />

        <SubmitButton
          pendingLabel="Sending…"
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          Send
        </SubmitButton>
      </div>
    </form>
  );
}
