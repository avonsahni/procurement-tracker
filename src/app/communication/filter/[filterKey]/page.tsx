import Link from "next/link";
import { notFound } from "next/navigation";
import { AtSign, CircleDot, Clock } from "lucide-react";
import { requireUser } from "../../shell";
import {
  listUnreadMentions,
  listOpenThreads,
  listProjectThreads,
} from "@/lib/communication/queries";
import { markMentionReadAction } from "../../actions";

// ── Relative time helper ──────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FilterPage({
  params,
}: {
  params: Promise<{ filterKey: string }>;
}) {
  const { filterKey } = await params;
  const userGate = requireUser(); // runs concurrently with the branch query below

  // mentions
  if (filterKey === "mentions") {
    const [, mentions] = await Promise.all([userGate, listUnreadMentions().catch(() => [])]);
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <AtSign className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-semibold text-slate-900">Mentions</h1>
          {mentions.length > 0 && (
            <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
              {mentions.length} unread
            </span>
          )}
        </div>

        {mentions.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <AtSign className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No unread mentions.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mentions.map((m) => (
              <div
                key={m.id}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/communication/${m.channel_id}/${m.thread_id}`}
                    className="text-sm font-medium text-slate-900 hover:text-blue-600 transition line-clamp-1"
                  >
                    {m.thread_title}
                  </Link>
                  <p className="text-xs text-slate-400 mt-0.5">
                    in #{m.channel_name} · {relativeTime(m.created_at)}
                  </p>
                </div>
                <form action={markMentionReadAction}>
                  <input type="hidden" name="mentionId" value={m.id} />
                  <input type="hidden" name="returnTo" value={`/communication/${m.channel_id}/${m.thread_id}`} />
                  <button
                    type="submit"
                    className="text-xs text-slate-400 hover:text-emerald-600 border border-slate-200 hover:border-emerald-300 rounded px-2 py-1 transition"
                  >
                    Mark read
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // open threads
  if (filterKey === "open") {
    const [, threads] = await Promise.all([userGate, listOpenThreads().catch(() => [])]);
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <CircleDot className="w-5 h-5 text-emerald-500" />
          <h1 className="text-lg font-semibold text-slate-900">All Open Threads</h1>
          {threads.length > 0 && (
            <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
              {threads.length}
            </span>
          )}
        </div>

        {threads.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CircleDot className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No open threads.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => (
              <Link
                key={t.id}
                href={`/communication/${t.channel_id}/${t.id}`}
                className="block bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:border-blue-300 hover:shadow-sm transition"
              >
                <p className="text-sm font-medium text-slate-900">{t.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">#{t.channel_name}</span>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-slate-400">
                    {t.message_count} messages
                  </span>
                  {t.last_message_at && (
                    <>
                      <span className="text-xs text-slate-300">·</span>
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-400">
                        {relativeTime(t.last_message_at)}
                      </span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // project-<uuid>
  if (filterKey.startsWith("project-")) {
    const projectId = filterKey.slice("project-".length);
    if (!projectId) {
      await userGate; // settle the gate before bailing so no rejection floats
      notFound();
    }

    const [, threads] = await Promise.all([userGate, listProjectThreads(projectId).catch(() => [])]);
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <CircleDot className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-semibold text-slate-900">Project Threads</h1>
          {threads.length > 0 && (
            <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
              {threads.length}
            </span>
          )}
        </div>

        {threads.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-sm">No threads for this project.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => (
              <Link
                key={t.id}
                href={`/communication/${t.channel_id}/${t.id}`}
                className="block bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:border-blue-300 hover:shadow-sm transition"
              >
                <p className="text-sm font-medium text-slate-900">{t.title}</p>
                <p className="text-xs text-slate-400 mt-1">
                  #{t.channel_name} · {t.message_count} messages
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  await userGate; // settle the gate before bailing so no rejection floats
  notFound();
}
