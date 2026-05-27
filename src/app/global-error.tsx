"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Global error boundary — catches errors in the root layout itself.
 * Must include <html> and <body> because it replaces the entire document.
 */
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "1rem",
            padding: "2rem",
            maxWidth: "28rem",
            width: "100%",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#1e293b", marginBottom: "0.5rem" }}>
            Application error
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1rem" }}>
            A critical error occurred. The team has been notified.
          </p>
          {error.digest && (
            <p style={{ color: "#94a3b8", fontSize: "0.7rem", fontFamily: "monospace" }}>
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1.25rem",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
