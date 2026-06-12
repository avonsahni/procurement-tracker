"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// ── Post a message ─────────────────────────────────────────────────────────────

export async function postMessageAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const threadId = formData.get("threadId") as string;
  const channelId = formData.get("channelId") as string;
  const body = (formData.get("body") as string | null)?.trim() ?? "";
  if (!body) return;

  // Use the RLS-scoped client so all message INSERT policies enforce naturally.
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    channel_id: channelId,
    org_id: user.orgId,
    author_id: user.id,
    body,
  });

  if (error) {
    console.error("[postMessage]", error.message);
    // Surface the error in the URL so the page can render it
    redirect(`/communication/${channelId}/${threadId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/communication/${channelId}/${threadId}`);
  redirect(`/communication/${channelId}/${threadId}`);
}

// ── Create a thread ───────────────────────────────────────────────────────────

export async function createThreadAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const channelId = formData.get("channelId") as string;
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  if (!title) return;

  // Verify channel is in the user's org and accessible (RLS handles this).
  const supabase = await createServerSupabase();
  const { data: channel, error: chErr } = await supabase
    .from("channels")
    .select("id,org_id")
    .eq("id", channelId)
    .maybeSingle();

  if (chErr || !channel) {
    redirect(`/communication/${channelId}?error=channel_not_found`);
  }

  const admin = createAdminSupabase();
  const { data: thread, error } = await admin
    .from("threads")
    .insert({
      channel_id: channelId,
      org_id: user.orgId,
      title,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !thread) {
    console.error("[createThread]", error?.message);
    redirect(`/communication/${channelId}?error=${encodeURIComponent(error?.message ?? "unknown")}`);
  }

  // Auto-add creator as owner participant
  await admin.from("thread_participants").insert({
    thread_id: thread.id,
    user_id: user.id,
    org_id: user.orgId,
    role: "owner",
  }).select().maybeSingle(); // ignore error (best-effort)

  revalidatePath(`/communication/${channelId}`);
  redirect(`/communication/${channelId}/${thread.id}`);
}

// ── Join a joinable public channel ────────────────────────────────────────────

export async function joinChannelAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const channelId = formData.get("channelId") as string;
  const admin = createAdminSupabase();

  // Verify channel is public + belongs to user's org
  const { data: channel } = await admin
    .from("channels")
    .select("id,org_id,is_private,archived_at")
    .eq("id", channelId)
    .eq("org_id", user.orgId)
    .maybeSingle();

  if (!channel || channel.is_private || channel.archived_at) {
    redirect(`/communication?error=cannot_join`);
  }

  await admin.from("channel_members").upsert({
    channel_id: channelId,
    user_id: user.id,
    org_id: user.orgId,
    role: "member",
  }, { onConflict: "channel_id,user_id" });

  revalidatePath(`/communication/${channelId}`);
  redirect(`/communication/${channelId}`);
}

// ── Mark a mention read ───────────────────────────────────────────────────────

export async function markMentionReadAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const mentionId = formData.get("mentionId") as string;
  const returnTo = (formData.get("returnTo") as string | null) ?? "/communication/filter/mentions";

  const admin = createAdminSupabase();
  await admin
    .from("mentions")
    .update({ read_at: new Date().toISOString() })
    .eq("id", mentionId)
    .eq("mentioned_user_id", user.id); // ownership check

  revalidatePath("/communication/filter/mentions");
  redirect(returnTo);
}

// ── Create a general channel (org admin only) ─────────────────────────────────

export async function createChannelAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!["owner", "admin"].includes(user.orgRole)) {
    redirect("/communication?error=permission_denied");
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const isPrivate = formData.get("is_private") === "true";
  if (!name) return;

  const admin = createAdminSupabase();
  const { data: channel, error } = await admin
    .from("channels")
    .insert({
      org_id: user.orgId,
      name,
      description,
      type: "general",
      is_private: isPrivate,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !channel) {
    console.error("[createChannel]", error?.message);
    redirect(`/communication?error=${encodeURIComponent(error?.message ?? "unknown")}`);
  }

  // Creator becomes admin member automatically
  await admin.from("channel_members").insert({
    channel_id: channel.id,
    user_id: user.id,
    org_id: user.orgId,
    role: "admin",
  });

  revalidatePath("/communication");
  redirect(`/communication/${channel.id}`);
}
