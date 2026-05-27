import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
};

export default withSentryConfig(nextConfig, {
  // ── Source-map upload ─────────────────────────────────────────────────────
  // Set SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT in your CI/hosting
  // environment to upload source maps so stack traces are readable.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silences the Sentry CLI output during builds.
  silent: !process.env.CI,

  // Upload source maps only in CI/production builds; skip locally.
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },

  // Automatically tree-shake Sentry logger statements to keep bundle small.
  // (disableLogger is deprecated in Sentry 10.x — use sourcemaps.deleteSourcemapsAfterUpload instead)
});
