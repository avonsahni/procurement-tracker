"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

/**
 * Route-level error boundary (App Router).
 * Catches unhandled errors within any page/layout segment, reports them to
 * /api/errors (logged to Supabase), and shows a friendly retry UI.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // Fire-and-forget — don't let logging failure surface to the user
    apiFetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message || "Unknown client error",
        stack: error.stack,
        route: pathname,
        context: { digest: error.digest ?? null },
      }),
    }).catch(() => {});
  }, [error, pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-slate-800">Something went wrong</h2>
        <p className="text-sm text-slate-500">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        {error.digest && (
          <p className="text-[11px] font-mono text-slate-400">ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
