"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// ── Post a message ─────────────────────────────────────────────────────────────

export async function postMessageAction(
  formData: FormData
): Promise<{ messageId: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const threadId = formData.get("threadId") as string;
  const channelId = formData.get("channelId") as string;
  const body = (formData.get("body") as string | null)?.trim() ?? "";
  if (!body) return { error: "empty" };

  // Guard against double-send: same body from same author in same thread within 5 s
  const admin = createAdminSupabase();
  const dedupeWindow = new Date(Date.now() - 5_000).toISOString();
  const { data: recentDup } = await admin
    .from("messages")
    .select("id")
    .eq("thread_id", threadId)
    .eq("author_id", user.id)
    .eq("body", body)
    .gte("created_at", dedupeWindow)
    .maybeSingle();

  if (recentDup) {
    return { messageId: recentDup.id };
  }

  // Use the RLS-scoped client so all message INSERT policies enforce naturally.
  const supabase = await createServerSupabase();
  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      thread_id: threadId,
      channel_id: channelId,
      org_id: user.orgId,
      author_id: user.id,
      body,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[postMessage]", error?.message);
    return { error: error?.message ?? "unknown" };
  }

  // Create mention records for @-mentioned users (body_rich is null in Phase 2 so the
  // trigger won't fire — we write the rows directly via the service-role client).
  const mentionedRaw = formData.get("mentionedUserIds") as string | null;
  if (mentionedRaw) {
    try {
      const mentionedUserIds = (JSON.parse(mentionedRaw) as string[])
        .filter((id, i, a) => a.indexOf(id) === i) // dedupe
        .filter((id) => id !== user.id);           // don't self-mention

      if (mentionedUserIds.length > 0) {
        await admin.from("mentions").insert(
          mentionedUserIds.map((uid) => ({
            message_id: inserted.id,
            thread_id: threadId,
            channel_id: channelId,
            org_id: user.orgId,
            mentioned_user_id: uid,
          }))
        );
      }
    } catch {
      // ignore malformed JSON — message is already saved
    }
  }

  // Optional file attachment — images and PDF only (mirrored from client-side guard)
  const ALLOWED_ATTACHMENT_MIME = new Set([
    "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf",
  ]);
  const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB server-side hard cap

  const file = formData.get("attachment") as File | null;
  if (
    file &&
    file.size > 0 &&
    file.size <= MAX_ATTACHMENT_BYTES &&
    ALLOWED_ATTACHMENT_MIME.has(file.type)
  ) {
    try {
      // Ensure the public storage bucket exists
      await admin.storage.createBucket("attachments", { public: true }).catch(() => {});

      // Encode the original filename in the path (no extra DB column needed)
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
      const path = `${user.orgId}/${inserted.id}/${Date.now()}_${safeName}`;
      const bytes = new Uint8Array(await file.arrayBuffer());

      const { error: uploadErr } = await admin.storage
        .from("attachments")
        .upload(path, bytes, { contentType: file.type || "application/octet-stream" });

      if (!uploadErr) {
        await admin.from("attachments").insert({
          message_id: inserted.id,
          org_id: user.orgId,
          storage_path: path,
          mime_type: file.type || "application/octet-stream",
          file_size: file.size,
          uploaded_by: user.id,
        });
      }
    } catch {
      // attachment failure is non-fatal — message is already saved
    }
  }

  revalidatePath(`/communication/${channelId}/${threadId}`);
  return { messageId: inserted.id };
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

  // Guard against duplicate submission — same title in same channel within 30 s
  const windowStart = new Date(Date.now() - 30_000).toISOString();
  const { data: recentDup } = await admin
    .from("threads")
    .select("id")
    .eq("channel_id", channelId)
    .eq("org_id", user.orgId)
    .eq("title", title)
    .gte("created_at", windowStart)
    .maybeSingle();

  if (recentDup) {
    redirect(`/communication/${channelId}/${recentDup.id}`);
  }

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

  // Guard against duplicate submissions — check for existing channel with same name
  const { data: existing } = await admin
    .from("channels")
    .select("id")
    .eq("org_id", user.orgId)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    redirect(`/communication/${existing.id}`);
  }

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
