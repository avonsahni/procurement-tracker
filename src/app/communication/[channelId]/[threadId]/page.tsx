import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ArchiveX } from "lucide-react";
import { requireUser } from "../../shell";
import {
  getChannel,
  getThread,
  listMessages,
  getProfiles,
  listOrgMembers,
  listAttachmentsByMessages,
} from "@/lib/communication/queries";
import ThreadClient from "./thread-client";

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string; threadId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { channelId, threadId } = await params;
  const { error } = await searchParams;

  // Auth check and RLS-scoped queries run concurrently — RLS already guards
  // the data, requireUser only decides whether to redirect.
  const [user, channel, thread, messages] = await Promise.all([
    requireUser(),
    getChannel(channelId),
    getThread(threadId),
    listMessages(threadId),
  ]);

  if (!channel || !thread) notFound();

  const messageIds = messages.map((m) => m.id);
  const authorIds  = [...new Set(messages.map((m) => m.author_id))];

  const [profiles, orgMembers, attachmentsMap] = await Promise.all([
    getProfiles(authorIds),
    listOrgMembers(user.orgId),
    listAttachmentsByMessages(messageIds),
  ]);

  const canPost = !channel.archived_at && thread.status === "open";

  return (
    <div className="flex flex-col h-full min-h-0" style={{ minHeight: "calc(100vh - 56px)" }}>
      {/* ── Thread header ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 shrink-0">
        <div className="flex items-start gap-3">
          <Link href={`/communication/${channelId}`}
            className="mt-0.5 text-slate-400 hover:text-slate-700 transition shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-400 mb-0.5">#{channel.name}</p>
            <h1 className="text-sm font-semibold text-slate-900 leading-snug">{thread.title}</h1>
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

      {/* ── ThreadClient handles messages + compose + typing ────────── */}
      <ThreadClient
        threadId={threadId}
        channelId={channelId}
        initialMessages={messages}
        initialProfiles={profiles}
        initialAttachments={attachmentsMap}
        currentUserId={user.id}
        currentUserName={user.fullName}
        orgMembers={orgMembers}
        canPost={canPost}
      />
    </div>
  );
}
