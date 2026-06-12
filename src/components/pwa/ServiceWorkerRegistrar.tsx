"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once on mount. Mounted high in the tree (root
 * layout) so the SW is available app-wide for offline support and push.
 * Silent no-op where service workers aren't supported.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[sw] registration failed:", err);
      });
    };

    // Register after load so it never competes with first paint.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
