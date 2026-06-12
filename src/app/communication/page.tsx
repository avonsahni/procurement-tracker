import Link from "next/link";
import { Hash, MessageSquarePlus } from "lucide-react";
import { requireUser } from "./shell";
import { listAccessibleChannels } from "@/lib/communication/queries";
import CreateChannelSection from "./create-channel-section";

export default async function HubPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; error?: string }>;
}) {
  const { new: showNew, error } = await searchParams;

  // Auth check and channel list load concurrently (RLS scopes the query).
  const [user, channels] = await Promise.all([
    requireUser(),
    listAccessibleChannels().catch(() => [] as Awaited<ReturnType<typeof listAccessibleChannels>>),
  ]);

  const isAdmin = ["owner", "admin"].includes(user.orgRole);
  const showNewChannel = showNew === "channel" && isAdmin;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Welcome */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquarePlus className="w-7 h-7 text-blue-600" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Team Hub</h1>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Collaborate with your team around procurement packages, milestones, and projects.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* New channel form — opens instantly client-side */}
      {isAdmin && (
        <CreateChannelSection
          defaultOpen={showNewChannel}
          showTrigger={channels.length === 0}
        />
      )}

      {/* Channel index */}
      {channels.length > 0 && (
        <div className="space-y-2">
          {channels.map((ch) => (
            <Link
              key={ch.id}
              href={`/communication/${ch.id}`}
              className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-blue-300 hover:shadow-sm transition group"
            >
              <div className="w-8 h-8 bg-slate-100 group-hover:bg-blue-50 rounded-lg flex items-center justify-center shrink-0 transition">
                <Hash className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{ch.name}</p>
                {ch.description && (
                  <p className="text-xs text-slate-400 truncate">{ch.description}</p>
                )}
              </div>
              {ch.archived_at && (
                <span className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
                  archived
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
