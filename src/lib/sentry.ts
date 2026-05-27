/**
 * Thin Sentry helpers for server-side API routes.
 *
 * Usage:
 *   import { captureApiError } from '@/lib/sentry';
 *   captureApiError(err, { route: '/api/packages/[id]', userId: auth.id });
 */
import * as Sentry from '@sentry/nextjs';

export function captureApiError(
  err: unknown,
  context?: Record<string, string | number | boolean | null | undefined>
) {
  Sentry.withScope(scope => {
    if (context) {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    }
    scope.setLevel('error');
    Sentry.captureException(err);
  });
}
