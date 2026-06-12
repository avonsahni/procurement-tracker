"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Paperclip, Pencil } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { postMessageAction } from "../../actions";
import ComposeBox from "../../compose-box";
import TypingIndicator from "./typing-indicator";
import type { MessageRow, AttachmentRow, OrgMember } from "@/lib/communication/queries";

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  authorName,
  isMine,
  attachments,
  isPending,
}: {
  msg: MessageRow;
  authorName: string;
  isMine: boolean;
  attachments: AttachmentRow[];
  isPending?: boolean;
}) {
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateLabel = new Date(msg.created_at).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <div className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
      <div className="flex items-baseline gap-2">
        {!isMine && <span className="text-xs font-semibold text-slate-700">{authorName}</span>}
        <span className="text-[10px] text-slate-400">
          {dateLabel} {time}
          {msg.edited_at && <span className="ml-1 text-slate-300 italic">(edited)</span>}
        </span>
      </div>

      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words transition-opacity ${
          isMine
            ? "bg-blue-600 text-white rounded-tr-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
        } ${isPending ? "opacity-60" : "opacity-100"}`}
      >
        {msg.body}
        {isPending && (
          <span className="ml-2 text-[10px] opacity-70 italic">sending…</span>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-col gap-1 mt-0.5">
          {attachments.map((att) => (
            <a key={att.id} href={att.public_url ?? "#"} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition ${
                isMine
                  ? "border-blue-400 text-blue-100 hover:bg-blue-500"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
              <Paperclip className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[200px]">
                {att.original_name ?? att.storage_path.split("/").pop()}
              </span>
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

// ── ThreadClient ───────────────────────────────────────────────────────────────

export default function ThreadClient({
  threadId,
  channelId,
  initialMessages,
  initialProfiles,
  initialAttachments,
  currentUserId,
  currentUserName,
  orgMembers,
  canPost,
}: {
  threadId: string;
  channelId: string;
  initialMessages: MessageRow[];
  initialProfiles: Record<string, string>;
  initialAttachments: Record<string, AttachmentRow[]>;
  currentUserId: string;
  currentUserName: string;
  orgMembers: OrgMember[];
  canPost: boolean;
}) {
  const [messages, setMessages]     = useState<MessageRow[]>(initialMessages);
  const [profiles, setProfiles]     = useState<Record<string, string>>(initialProfiles);
  const [attachments, setAttachments] = useState<Record<string, AttachmentRow[]>>(initialAttachments);
  const [sendError, setSendError]   = useState<string | null>(null);

  const bottomRef     = useRef<HTMLDivElement>(null);
  // Maps real server messageId → optimistic tempId so Realtime delivery resolves correctly
  const pendingMap    = useRef<Map<string, string>>(new Map());

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createBrowserSupabase();
    const ch = supabase
      .channel(`thread-messages:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const newMsg = payload.new as MessageRow;
          if (newMsg.deleted_at) return;

          const optId = pendingMap.current.get(newMsg.id);
          if (optId) {
            // Realtime delivered — swap the optimistic bubble for the real one
            pendingMap.current.delete(newMsg.id);
            setMessages((prev) => prev.map((m) => m.id === optId ? newMsg : m));
          } else {
            // Message from another user (or late Realtime after server already resolved)
            setMessages((prev) =>
              prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
            );
          }

          // Resolve author name if unknown
          if (!profiles[newMsg.author_id]) {
            const { data } = await supabase
              .from("profiles")
              .select("id,full_name")
              .eq("id", newMsg.author_id)
              .maybeSingle();
            if (data) {
              setProfiles((p) => ({ ...p, [data.id]: data.full_name ?? data.id.slice(0, 8) }));
            }
          }

          // Fetch attachments for new message
          const { data: atts } = await supabase
            .from("attachments")
            .select("*")
            .eq("message_id", newMsg.id);
          if (atts?.length) {
            setAttachments((prev) => ({ ...prev, [newMsg.id]: atts as AttachmentRow[] }));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [threadId]);

  // Auto-scroll when the list grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Send handler ────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (
    body: string,
    mentionedIds: string[],
    file: File | null
  ) => {
    setSendError(null);

    // 1. Add optimistic message immediately
    const optId = `opt_${Date.now()}`;
    const optimistic: MessageRow = {
      id: optId,
      thread_id: threadId,
      channel_id: channelId,
      org_id: "",
      author_id: currentUserId,
      body,
      body_rich: null,
      parent_message_id: null,
      edited_at: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    // 2. Call server action
    const fd = new FormData();
    fd.set("threadId", threadId);
    fd.set("channelId", channelId);
    fd.set("body", body);
    fd.set("mentionedUserIds", JSON.stringify(mentionedIds));
    if (file) fd.set("attachment", file, file.name);

    const result = await postMessageAction(fd);

    if ("error" in result) {
      setSendError(result.error);
      setMessages((prev) => prev.filter((m) => m.id !== optId));
      return;
    }

    const { messageId } = result;
    // Register in pending map so Realtime handler can resolve
    pendingMap.current.set(messageId, optId);

    // 3. If Realtime already delivered the real message, just remove the optimistic copy
    setMessages((prev) => {
      if (prev.some((m) => m.id === messageId)) {
        pendingMap.current.delete(messageId);
        return prev.filter((m) => m.id !== optId);
      }
      // Replace optimistic id with real id (keeps bubble in place)
      pendingMap.current.delete(messageId);
      return prev.map((m) => m.id === optId ? { ...m, id: messageId } : m);
    });
  }, [threadId, channelId, currentUserId]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <p className="text-sm">No messages yet.</p>
              <p className="text-xs mt-1">Be the first to write something.</p>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              authorName={
                profiles[msg.author_id] ??
                (msg.id.startsWith("opt_") ? currentUserName : msg.author_id.slice(0, 8))
              }
              isMine={msg.author_id === currentUserId}
              attachments={attachments[msg.id] ?? []}
              isPending={msg.id.startsWith("opt_")}
            />
          ))}
        </div>
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Compose area */}
      {canPost ? (
        <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-4">
          {sendError && (
            <div className="mb-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between">
              <span>Send failed: {sendError}</span>
              <button type="button" onClick={() => setSendError(null)}
                className="ml-2 text-red-400 hover:text-red-600">×</button>
            </div>
          )}
          <ComposeBox
            onSend={handleSend}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            members={orgMembers}
            threadId={threadId}
          />
          <div className="mt-1.5">
            <TypingIndicator threadId={threadId} currentUserId={currentUserId} />
          </div>
        </div>
      ) : (
        <div className="shrink-0 px-6 py-4 border-t border-slate-200 text-center text-xs text-slate-400">
          <Pencil className="w-3 h-3 inline mr-1" />
          Replying is disabled on archived / resolved threads.
        </div>
      )}
    </>
  );
}
