"use client";

/**
 * Browser-side Web Push helpers. All functions are no-ops / return safe values
 * when push is unsupported or the VAPID key is missing, so callers don't need
 * to feature-detect themselves.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Current permission, or "unsupported" when the browser can't do push. */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // Allocate on an explicit ArrayBuffer so the typed array is backed by
  // ArrayBuffer (not ArrayBufferLike) — required by PushManager.subscribe types.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.ready);
}

/** True if this browser already holds an active push subscription. */
export async function isSubscribed(): Promise<boolean> {
  const reg = await getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

/**
 * Requests permission (if needed), subscribes via PushManager, and registers
 * the subscription with the server. Returns true on success.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await getRegistration();
  if (!reg) return false;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });

  return res.ok;
}

/** Unsubscribes locally and tells the server to drop the subscription. */
export async function unsubscribeFromPush(): Promise<boolean> {
  const reg = await getRegistration();
  if (!reg) return false;

  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;

  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => {});

  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {});

  return true;
}
