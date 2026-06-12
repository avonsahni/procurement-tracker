import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquarePlus, CheckCircle2, Clock, ArchiveX } from "lucide-react";
import { requireUser } from "../shell";
import { getChannel, listThreads } from "@/lib/communication/queries";
import { createThreadAction } from "../actions";
import SubmitButton from "../submit-button";
import type { ThreadRow } from "@/lib/communication/queries";

// ── Thread status badge ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ThreadRow["status"] }) {
  if (status === "resolved")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
        <CheckCircle2 className="w-3 h-3" /> Resolved
      </span>
    );
  if (status === "closed")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
        <ArchiveX className="w-3 h-3" /> Closed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
      <Clock className="w-3 h-3" /> Open
    </span>
  );
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string }>;
  searchParams: Promise<{ new?: string; error?: string }>;
}) {
  await requireUser();
  const { channelId } = await params;
  const { new: showNew, error } = await searchParams;

  const [channel, threads] = await Promise.all([
    getChannel(channelId),
    listThreads(channelId),
  ]);

  if (!channel) notFound();

  const showNewThread = showNew === "thread";

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Channel header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900"># {channel.name}</h1>
          {channel.description && (
            <p className="text-sm text-slate-500 mt-0.5">{channel.description}</p>
          )}
        </div>
        {!channel.archived_at && (
          <Link
            href={`/communication/${channelId}?new=thread`}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition shrink-0"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" /> New Thread
          </Link>
        )}
      </div>

      {channel.archived_at && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
          <ArchiveX className="w-4 h-4 shrink-0" />
          This channel is archived. No new threads or messages can be posted.
        </div>
      )}

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* New thread form */}
      {showNewThread && !channel.archived_at && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Start a new thread</h2>
          <form action={createThreadAction} className="space-y-3">
            <input type="hidden" name="channelId" value={channelId} />
            <input
              name="title"
              required
              maxLength={200}
              placeholder="Thread title…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
            />
            <div className="flex gap-2">
              <SubmitButton
                pendingLabel="Creating…"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                Create thread
              </SubmitButton>
              <Link
                href={`/communication/${channelId}`}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      )}

      {/* Thread list */}
      {threads.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageSquarePlus className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No threads yet.</p>
          {!channel.archived_at && (
            <p className="text-xs mt-1">
              <Link href={`/communication/${channelId}?new=thread`} className="text-blue-500 hover:underline">
                Start the first thread
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/communication/${channelId}/${t.id}`}
              className="block bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:border-blue-300 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-900 leading-snug">{t.title}</p>
                <StatusBadge status={t.status} />
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-slate-400">
                  {t.message_count} {t.message_count === 1 ? "message" : "messages"}
                </span>
                {t.last_message_at && (
                  <span className="text-xs text-slate-400">
                    · last activity {relativeTime(t.last_message_at)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
