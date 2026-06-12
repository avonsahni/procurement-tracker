import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, ArchiveX } from "lucide-react";
import { requireUser } from "../../shell";
import { getChannel, getThread, listMessages, getProfiles, listOrgMembers } from "@/lib/communication/queries";
import ComposeBox from "../../compose-box";

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  body,
  authorName,
  createdAt,
  editedAt,
  isMine,
}: {
  body: string;
  authorName: string;
  createdAt: string;
  editedAt: string | null;
  isMine: boolean;
}) {
  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateLabel = new Date(createdAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} gap-0.5`}>
      <div className="flex items-baseline gap-2">
        {!isMine && (
          <span className="text-xs font-semibold text-slate-700">{authorName}</span>
        )}
        <span className="text-[10px] text-slate-400">
          {dateLabel} {time}
          {editedAt && <span className="ml-1 text-slate-300 italic">(edited)</span>}
        </span>
      </div>
      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isMine
            ? "bg-blue-600 text-white rounded-tr-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
        }`}
      >
        {body}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string; threadId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { channelId, threadId } = await params;
  const { error } = await searchParams;

  const [channel, thread, messages] = await Promise.all([
    getChannel(channelId),
    getThread(threadId),
    listMessages(threadId),
  ]);

  if (!channel || !thread) notFound();

  // Fetch display names for authors, and org members for the @mention picker
  const authorIds = [...new Set(messages.map((m) => m.author_id))];
  const [profiles, orgMembers] = await Promise.all([
    getProfiles(authorIds),
    listOrgMembers(channel.org_id),
  ]);

  const canPost = !channel.archived_at && thread.status === "open";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Thread header ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 shrink-0">
        <div className="flex items-start gap-3">
          <Link
            href={`/communication/${channelId}`}
            className="mt-0.5 text-slate-400 hover:text-slate-700 transition shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-400 mb-0.5">
              #{channel.name}
            </p>
            <h1 className="text-sm font-semibold text-slate-900 leading-snug">
              {thread.title}
            </h1>
          </div>
          {thread.status !== "open" && (
            <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 rounded px-2 py-0.5 shrink-0">
              {thread.status}
            </span>
          )}
        </div>
      </div>

      {/* ── Banners ────────────────────────────────────────────────── */}
      {(channel.archived_at || thread.status !== "open") && (
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center gap-2 shrink-0">
          <ArchiveX className="w-3.5 h-3.5 shrink-0" />
          {channel.archived_at
            ? "Channel is archived — no new messages."
            : "This thread is resolved — no new messages."}
        </div>
      )}

      {error && (
        <div className="mx-6 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 shrink-0">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* ── Message list ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-sm">No messages yet.</p>
            {canPost && (
              <p className="text-xs mt-1">Be the first to write something.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                body={msg.body}
                authorName={profiles[msg.author_id] ?? msg.author_id.slice(0, 8)}
                createdAt={msg.created_at}
                editedAt={msg.edited_at}
                isMine={msg.author_id === user.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Compose box ────────────────────────────────────────────── */}
      {canPost ? (
        <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-4">
          <ComposeBox
            threadId={threadId}
            channelId={channelId}
            members={orgMembers}
          />
          <p className="text-[10px] text-slate-400 mt-1.5">
            Type @ to mention someone · page refreshes after send
          </p>
        </div>
      ) : (
        <div className="shrink-0 px-6 py-4 border-t border-slate-200 text-center text-xs text-slate-400">
          <Pencil className="w-3 h-3 inline mr-1" />
          Replying is disabled on archived / resolved threads.
        </div>
      )}
    </div>
  );
}
