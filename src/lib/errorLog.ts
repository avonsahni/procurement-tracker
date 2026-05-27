/**
 * Server-side application error logger.
 * Writes to the `error_log` Supabase table via the admin (service-role) client.
 * Never throws — a logging failure must never break the request.
 *
 * Usage:
 *   import { logError } from '@/lib/errorLog';
 *   await logError(err, { route: '/api/packages/[id]', userId: auth.id, orgId: auth.orgId });
 */
import { createAdminSupabase } from '@/lib/supabase/admin';

export type ErrorLevel = 'error' | 'warn' | 'info';
export type ErrorSource = 'server' | 'client' | 'api';

export interface ErrorLogEntry {
  level?: ErrorLevel;
  source?: ErrorSource;
  route?: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userId?: string | null;
  orgId?: string | null;
}

export async function logError(
  err: unknown,
  meta: Omit<ErrorLogEntry, 'message' | 'stack'> = {}
): Promise<void> {
  try {
    const message =
      err instanceof Error ? err.message : String(err ?? 'Unknown error');
    const stack =
      err instanceof Error ? (err.stack ?? undefined) : undefined;

    const admin = createAdminSupabase();
    await admin.from('error_log').insert({
      level:   meta.level   ?? 'error',
      source:  meta.source  ?? 'api',
      route:   meta.route   ?? null,
      message,
      stack:   stack        ?? null,
      context: meta.context ?? null,
      user_id: meta.userId  ?? null,
      org_id:  meta.orgId   ?? null,
    });
  } catch (loggingErr) {
    // Last-resort console output — never rethrow
    console.error('[errorLog] failed to persist error:', loggingErr);
    console.error('[errorLog] original error:', err);
  }
}

/**
 * Convenience wrapper that also calls console.error so server logs stay intact.
 */
export async function logAndConsole(
  label: string,
  err: unknown,
  meta: Omit<ErrorLogEntry, 'message' | 'stack'> = {}
): Promise<void> {
  console.error(`[${label}]`, err);
  await logError(err, meta);
}
