import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10 % of transactions for performance monitoring.
  // Raise to 1.0 in dev if you need full traces.
  tracesSampleRate: 0.1,

  // Capture replays only for sessions that include an error.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media so no personal data leaks into replays.
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Only report errors in production; silence noise in local dev.
  enabled: process.env.NODE_ENV === 'production',
});
