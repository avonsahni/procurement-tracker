import Link from "next/link";
import {
  Hash, Lock, Folder, Link2, MessageCircle, AtSign, CircleDot, Plus, ChevronLeft,
} from "lucide-react";
import { requireUser } from "./shell";
import { listAccessibleChannels, countUnreadMentions } from "@/lib/communication/queries";
import UserMenu from "@/components/UserMenu";
import HelpButton from "@/components/HelpButton";
import { LogoMark } from "@/components/Logo";
import MentionBadgeLive from "./mention-badge-live";
import type { ChannelRow } from "@/lib/communication/queries";

// ── Channel icon by type / privacy ────────────────────────────────────────────

function ChannelIcon({ channel, size = 14 }: { channel: ChannelRow; size?: number }) {
  if (channel.is_private) return <Lock style={{ width: size, height: size }} className="shrink-0 text-slate-400" />;
  if (channel.type === "project") return <Folder style={{ width: size, height: size }} className="shrink-0 text-blue-400" />;
  if (channel.type === "entity") return <Link2 style={{ width: size, height: size }} className="shrink-0 text-violet-400" />;
  if (channel.type === "direct") return <MessageCircle style={{ width: size, height: size }} className="shrink-0 text-emerald-400" />;
  return <Hash style={{ width: size, height: size }} className="shrink-0 text-slate-400" />;
}

// ── Sidebar channel list section ──────────────────────────────────────────────

function ChannelSection({
  label,
  channels,
}: {
  label: string;
  channels: ChannelRow[];
}) {
  if (channels.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      {channels.map((ch) => (
        <Link
          key={ch.id}
          href={`/communication/${ch.id}`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition group"
        >
          <ChannelIcon channel={ch} />
          <span className="truncate">{ch.name}</span>
          {ch.archived_at && (
            <span className="ml-auto text-[10px] text-slate-400">archived</span>
          )}
        </Link>
      ))}
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default async function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  let channels: ChannelRow[] = [];
  let unread = 0;
  try {
    [channels, unread] = await Promise.all([
      listAccessibleChannels(),
      countUnreadMentions(),
    ]);
  } catch {
    // Non-fatal: render with empty sidebar rather than crashing the page
  }

  const generalChannels = channels.filter((c) => c.type === "general");
  const projectChannels = channels.filter((c) => c.type === "project");
  const entityChannels  = channels.filter((c) => c.type === "entity");
  const directChannels  = channels.filter((c) => c.type === "direct");

  const isAdmin = ["owner", "admin"].includes(user.orgRole);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-full px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <LogoMark size={30} className="shrink-0" />
            </Link>
            <span className="text-slate-300 select-none">/</span>
            <Link
              href="/communication"
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 hover:text-blue-600 transition"
            >
              <MessageCircle className="w-4 h-4 text-blue-500" />
              Team Hub
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <HelpButton />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-slate-100">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
            >
              <ChevronLeft className="w-3 h-3" /> Back to Dashboard
            </Link>
          </div>

          <nav className="flex-1 p-2 pt-3">
            {/* Filters */}
            <div className="mb-4">
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Inbox
              </p>

              <Link
                href="/communication/filter/mentions"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition"
              >
                <AtSign className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                <span>Mentions</span>
                <MentionBadgeLive initialCount={unread} userId={user.id} />
              </Link>

              <Link
                href="/communication/filter/open"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition"
              >
                <CircleDot className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>All Open</span>
              </Link>
            </div>

            {/* Channel groups */}
            <ChannelSection label="General" channels={generalChannels} />
            <ChannelSection label="Projects" channels={projectChannels} />
            <ChannelSection label="Packages & Milestones" channels={entityChannels} />
            <ChannelSection label="Direct Messages" channels={directChannels} />

            {channels.length === 0 && (
              <p className="px-3 py-4 text-xs text-slate-400 text-center">
                No channels yet.
                {isAdmin && " Create one below."}
              </p>
            )}
          </nav>

          {/* New channel (admins only) */}
          {isAdmin && (
            <div className="p-3 border-t border-slate-100">
              <Link
                href="/communication?new=channel"
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" /> New Channel
              </Link>
            </div>
          )}
        </aside>

        {/* ── Main content ──────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
