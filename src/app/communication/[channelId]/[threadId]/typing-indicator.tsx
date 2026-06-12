"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

const TTL_MS = 3500; // clear after 3.5 s of silence

type TypingEntry = { id: string; name: string; at: number };

export default function TypingIndicator({
  threadId,
  currentUserId,
}: {
  threadId: string;
  currentUserId: string;
}) {
  const [typingUsers, setTypingUsers] = useState<TypingEntry[]>([]);
  const gcRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const ch = supabase
      .channel(`typing:${threadId}`)
      .on("broadcast", { event: "typing" }, (event) => {
        const { user_id, full_name } = event.payload as {
          user_id: string;
          full_name: string;
        };
        if (user_id === currentUserId) return;

        setTypingUsers((prev) => {
          const filtered = prev.filter((u) => u.id !== user_id);
          return [...filtered, { id: user_id, name: full_name, at: Date.now() }];
        });
      })
      .subscribe();

    // Garbage-collect stale entries every second
    gcRef.current = setInterval(() => {
      setTypingUsers((prev) =>
        prev.filter((u) => Date.now() - u.at < TTL_MS)
      );
    }, 1000);

    return () => {
      supabase.removeChannel(ch);
      if (gcRef.current) clearInterval(gcRef.current);
    };
  }, [threadId, currentUserId]);

  if (typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.name);
  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing…`
      : `${names[0]} and ${names.length - 1} others are typing…`;

  return (
    <p className="text-[11px] text-slate-400 px-1 h-4 leading-none select-none">
      <span className="inline-flex items-center gap-1">
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
        {label}
      </span>
    </p>
  );
}
