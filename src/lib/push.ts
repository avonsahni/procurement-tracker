import webpush from "web-push";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * Web Push fan-out helper.
 *
 * VAPID keys are read from the environment:
 *   • NEXT_PUBLIC_VAPID_PUBLIC_KEY  — also exposed to the browser for subscribe()
 *   • VAPID_PRIVATE_KEY             — server-only signing key
 *   • VAPID_SUBJECT                 — mailto: or https: contact (defaults below)
 *
 * If keys are absent (e.g. local dev without push configured), sends are
 * silently skipped so the rest of the app keeps working.
 */

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  const subject = process.env.VAPID_SUBJECT || "mailto:support@procuretrack.in";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Path the notification click should open, e.g. /communication/<ch>/<thread> */
  url?: string;
  /** Collapses notifications that share a tag so they don't stack endlessly */
  tag?: string;
  icon?: string;
};

/**
 * Sends a push notification to every registered device for a user.
 * Dead subscriptions (410 Gone / 404) are pruned automatically.
 * Fire-and-forget friendly — never throws; logs and moves on.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const admin = createAdminSupabase();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subs || subs.length === 0) return;

  const body = JSON.stringify(payload);
  const deadIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        // 410 Gone / 404 Not Found — subscription is dead, prune it.
        if (status === 410 || status === 404) {
          deadIds.push(sub.id);
        } else {
          console.error("[push] send failed:", (err as Error)?.message ?? err);
        }
      }
    })
  );

  if (deadIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", deadIds);
  }
}

/**
 * Convenience fan-out to several users at once (e.g. all mentioned users).
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  const unique = [...new Set(userIds)];
  await Promise.all(unique.map((id) => sendPushToUser(id, payload)));
}
