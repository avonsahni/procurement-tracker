"use client";

import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { postMessageAction } from "./actions";
import SubmitButton from "./submit-button";
import type { OrgMember } from "@/lib/communication/queries";

export type { OrgMember };

const MAX_DROPDOWN = 6;

export default function ComposeBox({
  threadId,
  channelId,
  members,
}: {
  threadId: string;
  channelId: string;
  members: OrgMember[];
}) {
  const [body, setBody] = useState("");
  // Set of user IDs inserted via @mention in this compose session
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  // null = no active @query, string = text typed after the @ symbol
  const [query, setQuery] = useState<string | null>(null);
  const [dropIdx, setDropIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered =
    query !== null
      ? members
          .filter((m) => m.full_name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, MAX_DROPDOWN)
      : [];

  function syncQuery(val: string, cursorPos: number) {
    // Find the innermost `@word` that ends at the cursor
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

    // Restore focus and move cursor past the inserted token
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

  return (
    <form action={postMessageAction} className="flex gap-3 items-end">
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="channelId" value={channelId} />
      <input
        type="hidden"
        name="mentionedUserIds"
        value={JSON.stringify(mentionedIds)}
      />

      <div className="flex-1 relative">
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
                // mousedown fires before blur so we prevent default to keep textarea focus
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
                <span className="text-sm text-slate-800 truncate">
                  {m.full_name}
                </span>
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          name="body"
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          required
          rows={2}
          placeholder="Write a message… type @ to mention someone"
          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
        />
      </div>

      <SubmitButton
        pendingLabel="Sending…"
        className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition shrink-0"
      >
        <Send className="w-3.5 h-3.5" />
        Send
      </SubmitButton>
    </form>
  );
}
