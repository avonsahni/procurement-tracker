import Link from "next/link";
import { Plus, Hash, MessageSquarePlus } from "lucide-react";
import { requireUser } from "./shell";
import { listAccessibleChannels } from "@/lib/communication/queries";
import { createChannelAction } from "./actions";
import SubmitButton from "./submit-button";

export default async function HubPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { new: showNew, error } = await searchParams;

  let channels: Awaited<ReturnType<typeof listAccessibleChannels>> = [];
  try {
    channels = await listAccessibleChannels();
  } catch {
    // show empty state
  }

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

      {/* New channel form */}
      {showNewChannel ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-8">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Create a channel</h2>
          <form action={createChannelAction} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Channel name <span className="text-red-400">*</span>
              </label>
              <input
                name="name"
                required
                maxLength={80}
                placeholder="e.g. procurement-updates"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description
              </label>
              <input
                name="description"
                maxLength={200}
                placeholder="What&apos;s this channel for?"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_private"
                name="is_private"
                value="true"
                className="rounded border-slate-300"
              />
              <label htmlFor="is_private" className="text-xs text-slate-700">
                Private (invite-only)
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <SubmitButton
                pendingLabel="Creating…"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                Create channel
              </SubmitButton>
              <Link
                href="/communication"
                className="px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      ) : channels.length === 0 && isAdmin ? (
        <div className="text-center">
          <Link
            href="/communication?new=channel"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> Create your first channel
          </Link>
        </div>
      ) : null}

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
