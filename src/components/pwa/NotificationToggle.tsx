"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import {
  isPushSupported,
  getNotificationPermission,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";

/**
 * A self-contained toggle for enabling/disabling push notifications on this
 * device. Renders nothing when push is unsupported or not configured (no
 * VAPID key), so it can be dropped into any toolbar safely.
 *
 * `variant="row"` renders a full-width sidebar row (used in Team Hub).
 * `variant="icon"` renders a compact icon button (used in headers).
 */
export default function NotificationToggle({
  variant = "row",
}: {
  variant?: "row" | "icon";
}) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hasVapid = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!isPushSupported() || !hasVapid) {
      setSupported(false);
      return;
    }
    setSupported(true);
    setDenied(getNotificationPermission() === "denied");
    isSubscribed().then(setSubscribed);
  }, []);

  if (!supported) return null;

  async function handleToggle() {
    setBusy(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        const ok = await subscribeToPush();
        setSubscribed(ok);
        setDenied(getNotificationPermission() === "denied");
      }
    } finally {
      setBusy(false);
    }
  }

  // Permission was hard-denied in the browser — toggling can't help, so guide the user.
  if (denied && !subscribed) {
    if (variant === "icon") {
      return (
        <span
          title="Notifications are blocked in your browser settings"
          className="inline-flex items-center justify-center p-2 text-slate-300"
        >
          <BellOff className="w-4 h-4" />
        </span>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
        <BellOff className="w-3.5 h-3.5 shrink-0" />
        <span>Notifications blocked in browser settings</span>
      </div>
    );
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handleToggle}
        disabled={busy}
        title={subscribed ? "Disable notifications" : "Enable notifications"}
        className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : subscribed ? (
          <BellRing className="w-4 h-4 text-blue-600" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg transition disabled:opacity-50 ${
        subscribed
          ? "text-blue-700 bg-blue-50 hover:bg-blue-100"
          : "text-slate-600 hover:text-blue-700 hover:bg-blue-50"
      }`}
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : subscribed ? (
        <BellRing className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Bell className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>{subscribed ? "Notifications on" : "Enable notifications"}</span>
    </button>
  );
}
