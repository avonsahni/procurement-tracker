"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createChannelAction } from "./actions";
import SubmitButton from "./submit-button";

/**
 * "Create channel" form with a client-side toggle so it opens instantly.
 * `defaultOpen` preserves the sidebar's `?new=channel` deep link.
 * `showTrigger` shows the centered call-to-action when the org has no channels.
 */
export default function CreateChannelSection({
  defaultOpen,
  showTrigger,
}: {
  defaultOpen: boolean;
  showTrigger: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!open) {
    if (!showTrigger) return null;
    return (
      <div className="text-center">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" /> Create your first channel
        </button>
      </div>
    );
  }

  return (
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
            autoFocus
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
            placeholder="What's this channel for?"
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
  );
}
