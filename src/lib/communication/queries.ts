import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// ── Row types (snake_case, direct from DB) ────────────────────────────────────

export type ChannelRow = {
  id: string;
  org_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  type: "project" | "general" | "direct" | "entity";
  entity_type: string | null;
  entity_id: string | null;
  is_private: boolean;
  created_by: string;
  created_at: string;
  archived_at: string | null;
};

export type ThreadRow = {
  id: string;
  channel_id: string;
  org_id: string;
  title: string;
  status: "open" | "resolved" | "closed";
  created_by: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  last_message_at: string | null;
  message_count: number;
};

export type MessageRow = {
  id: string;
  thread_id: string;
  channel_id: string;
  org_id: string;
  author_id: string;
  body: string;
  body_rich: unknown | null;
  parent_message_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type MentionRow = {
  id: string;
  message_id: string;
  thread_id: string;
  channel_id: string;
  org_id: string;
  mentioned_user_id: string;
  read_at: string | null;
  created_at: string;
};

export type ProfileRow = { id: string; full_name: string | null };

// ── Channel queries ───────────────────────────────────────────────────────────

/** All channels the authenticated user can access (RLS filters). */
export async function listAccessibleChannels(): Promise<ChannelRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("channels")
    .select("id,org_id,project_id,name,description,type,entity_type,entity_id,is_private,created_by,created_at,archived_at")
    .order("type")
    .order("name");
  if (error) throw error;
  return (data ?? []) as ChannelRow[];
}

/** Single channel — null if not found or no access. */
export async function getChannel(channelId: string): Promise<ChannelRow | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("channels")
    .select("id,org_id,project_id,name,description,type,entity_type,entity_id,is_private,created_by,created_at,archived_at")
    .eq("id", channelId)
    .maybeSingle();
  if (error) throw error;
  return data as ChannelRow | null;
}

// ── Thread queries ────────────────────────────────────────────────────────────

/** Threads in a channel, most-recently-active first. */
export async function listThreads(channelId: string): Promise<ThreadRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("threads")
    .select("id,channel_id,org_id,title,status,created_by,created_at,resolved_at,resolved_by,last_message_at,message_count")
    .eq("channel_id", channelId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ThreadRow[];
}

/** Single thread — null if not found or no access. */
export async function getThread(threadId: string): Promise<ThreadRow | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("threads")
    .select("id,channel_id,org_id,title,status,created_by,created_at,resolved_at,resolved_by,last_message_at,message_count")
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw error;
  return data as ThreadRow | null;
}

// ── Message queries ───────────────────────────────────────────────────────────

/** All non-deleted messages in a thread, oldest first. */
export async function listMessages(threadId: string): Promise<MessageRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("id,thread_id,channel_id,org_id,author_id,body,body_rich,parent_message_id,edited_at,deleted_at,created_at")
    .eq("thread_id", threadId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

// ── Mention queries ───────────────────────────────────────────────────────────

/** Count of unread mentions for the current user. */
export async function countUnreadMentions(): Promise<number> {
  const supabase = await createServerSupabase();
  const { count, error } = await supabase
    .from("mentions")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

/** Unread mention rows with joined thread/channel names. */
export async function listUnreadMentions(): Promise<
  (MentionRow & { thread_title: string; channel_name: string })[]
> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("mentions")
    .select(
      "id,message_id,thread_id,channel_id,org_id,mentioned_user_id,read_at,created_at,threads(title),channels(name)"
    )
    .is("read_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    thread_title: r.threads?.title ?? "(thread)",
    channel_name: r.channels?.name ?? "(channel)",
  }));
}

/** All open threads across the tenant (RLS-scoped). */
export async function listOpenThreads(): Promise<
  (ThreadRow & { channel_name: string })[]
> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("threads")
    .select(
      "id,channel_id,org_id,title,status,created_by,created_at,resolved_at,resolved_by,last_message_at,message_count,channels(name)"
    )
    .eq("status", "open")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    channel_name: r.channels?.name ?? "(channel)",
  }));
}

/** Threads belonging to channels whose project_id matches. */
export async function listProjectThreads(
  projectId: string
): Promise<(ThreadRow & { channel_name: string })[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("threads")
    .select(
      "id,channel_id,org_id,title,status,created_by,created_at,resolved_at,resolved_by,last_message_at,message_count,channels!inner(name,project_id)"
    )
    .eq("channels.project_id", projectId)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    channel_name: r.channels?.name ?? "(channel)",
  }));
}

// ── Profile lookups (service role — profiles may be read-only to anon) ────────

/** Batch-fetch display names by user ID. */
export async function getProfiles(
  userIds: string[]
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("profiles")
    .select("id,full_name")
    .in("id", userIds);
  const map: Record<string, string> = {};
  for (const p of data ?? []) {
    map[p.id] = (p as ProfileRow).full_name ?? p.id.slice(0, 8);
  }
  return map;
}
