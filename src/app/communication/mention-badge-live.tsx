"use client";

import { useState, useEffect } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

/**
 * Swaps the static unread-mention count from SSR with a live-updating one.
 * Subscribes to INSERT on mentions (new mention) and UPDATE (read_at set).
 */
export default function MentionBadgeLive({
  initialCount,
  userId,
}: {
  initialCount: number;
  userId: string;
}) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const ch = supabase
      .channel(`mentions-badge:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mentions",
          filter: `mentioned_user_id=eq.${userId}`,
        },
        () => setCount((n) => n + 1)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mentions",
          filter: `mentioned_user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as { read_at: string | null };
          const previous = payload.old as { read_at: string | null };
          if (updated.read_at && !previous.read_at) {
            setCount((n) => Math.max(0, n - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  if (count === 0) return null;
  return (
    <span className="ml-auto bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}
