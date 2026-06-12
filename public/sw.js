/* ProcureTrack service worker — PWA offline shell + Web Push.
 *
 * Caching strategy is deliberately conservative because this is a multi-tenant
 * app with per-user, RLS-scoped data:
 *   • /api/* and Supabase calls are NEVER intercepted — always hit the network.
 *   • Navigations are network-first, falling back to an offline page only when
 *     the network is unreachable (so users never see another tenant's cached HTML).
 *   • Immutable hashed assets (/_next/static, icons) are cache-first.
 */

const VERSION = "v1";
const STATIC_CACHE = `pt-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  OFFLINE_URL,
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// ── Activate — purge old caches ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET — never cache POST/PUT/etc.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only. Let Supabase / third-party / API traffic pass straight through.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Immutable hashed assets + our icons — cache-first.
  if (url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resp) => {
            const copy = resp.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return resp;
          })
      )
    );
    return;
  }

  // Navigations — network-first with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
});

// ── Push — display the notification ─────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "ProcureTrack", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "ProcureTrack";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || undefined,
    data: { url: payload.url || "/" },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click — focus an existing tab or open a new one ─────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus an open tab on the same origin and navigate it.
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(targetUrl).catch(() => {});
          return;
        }
      }
      // No open tab — open a fresh one.
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
