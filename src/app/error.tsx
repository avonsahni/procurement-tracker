"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Route-level error boundary (App Router).
 * Sentry captures the error; the UI shows a friendly message.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

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
          An unexpected error occurred. The team has been notified automatically.
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
