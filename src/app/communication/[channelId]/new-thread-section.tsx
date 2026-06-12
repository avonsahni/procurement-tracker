"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { createThreadAction } from "../actions";
import SubmitButton from "../submit-button";

/**
 * Channel header + "New Thread" form with a client-side toggle, so opening the
 * form is instant instead of a full server navigation to `?new=thread`.
 * `defaultOpen` keeps the deep-link behaviour working.
 */
export default function NewThreadSection({
  channelId,
  name,
  description,
  archived,
  defaultOpen,
}: {
  channelId: string;
  name: string;
  description: string | null;
  archived: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen && !archived);

  return (
    <>
      {/* Channel header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900"># {name}</h1>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        {!archived && !open && (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition shrink-0"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" /> New Thread
          </button>
        )}
      </div>

      {/* New thread form */}
      {open && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Start a new thread</h2>
          <form action={createThreadAction} className="space-y-3">
            <input type="hidden" name="channelId" value={channelId} />
            <input
              name="title"
              required
              autoFocus
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
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
