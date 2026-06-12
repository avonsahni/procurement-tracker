"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { MessageRow, AttachmentRow } from "@/lib/communication/queries";
import { Paperclip } from "lucide-react";

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  authorName,
  isMine,
  attachments,
}: {
  msg: MessageRow;
  authorName: string;
  isMine: boolean;
  attachments: AttachmentRow[];
}) {
  const time = new Date(msg.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateLabel = new Date(msg.created_at).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}
    >
      <div className="flex items-baseline gap-2">
        {!isMine && (
          <span className="text-xs font-semibold text-slate-700">{authorName}</span>
        )}
        <span className="text-[10px] text-slate-400">
          {dateLabel} {time}
          {msg.edited_at && (
            <span className="ml-1 text-slate-300 italic">(edited)</span>
          )}
        </span>
      </div>

      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isMine
            ? "bg-blue-600 text-white rounded-tr-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
        }`}
      >
        {msg.body}
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-col gap-1 mt-0.5">
          {attachments.map((att) => (
            <a
              key={att.id}
              href={att.public_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition ${
                isMine
                  ? "border-blue-400 text-blue-100 hover:bg-blue-500"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Paperclip className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[200px]">{att.original_name ?? att.storage_path.split("/").pop()}</span>
              <span className="text-[10px] opacity-70">
                {att.file_size ? `${(att.file_size / 1024).toFixed(0)} KB` : ""}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Live messages list ─────────────────────────────────────────────────────────

export default function MessagesLive({
  threadId,
  initialMessages,
  initialProfiles,
  initialAttachments,
  currentUserId,
}: {
  threadId: string;
  initialMessages: MessageRow[];
  initialProfiles: Record<string, string>;
  initialAttachments: Record<string, AttachmentRow[]>;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [profiles, setProfiles] = useState<Record<string, string>>(initialProfiles);
  const [attachments, setAttachments] =
    useState<Record<string, AttachmentRow[]>>(initialAttachments);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Realtime: new messages in this thread
  useEffect(() => {
    const supabase = createBrowserSupabase();
    const ch = supabase
      .channel(`thread-messages:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          const newMsg = payload.new as MessageRow;
          if (newMsg.deleted_at) return;

          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          );

          // Resolve missing author name
          if (!profiles[newMsg.author_id]) {
            const { data } = await supabase
              .from("profiles")
              .select("id,full_name")
              .eq("id", newMsg.author_id)
              .maybeSingle();
            if (data) {
              setProfiles((p) => ({
                ...p,
                [data.id]: data.full_name ?? data.id.slice(0, 8),
              }));
            }
          }

          // Fetch attachments for the new message
          const { data: atts } = await supabase
            .from("attachments")
            .select("*")
            .eq("message_id", newMsg.id);

          if (atts && atts.length > 0) {
            setAttachments((prev) => ({ ...prev, [newMsg.id]: atts as AttachmentRow[] }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [threadId]);

  // Auto-scroll to bottom whenever the message list grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <p className="text-sm">No messages yet.</p>
          <p className="text-xs mt-1">Be the first to write something.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="space-y-3">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            authorName={profiles[msg.author_id] ?? msg.author_id.slice(0, 8)}
            isMine={msg.author_id === currentUserId}
            attachments={attachments[msg.id] ?? []}
          />
        ))}
      </div>
      {/* Scroll anchor */}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
