/**
 * Single-active-session enforcement.
 *
 * One user account may hold only one active session at a time. Each login
 * issues a random session id, stored both in an httpOnly cookie on the device
 * and in the `active_sessions` table (one row per user). Every authenticated
 * request compares the cookie against the stored id — a mismatch means another
 * device has taken over, and the request is treated as logged out.
 *
 * A session is considered "fresh" while it keeps heart-beating (any request, or
 * the client's periodic ping, refreshes `last_seen_at`). Once a device goes
 * quiet for longer than SESSION_STALE_MS — e.g. the browser was closed — the
 * slot is freed so the user can log in again elsewhere.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export const SESSION_COOKIE = 'ps_session';

/** A session with no activity for longer than this is treated as abandoned. */
export const SESSION_STALE_MS = 10 * 60_000; // 10 minutes

/** Don't rewrite last_seen_at more often than this (write throttle). */
const HEARTBEAT_MS = 30_000; // 30 seconds

export interface ActiveSessionRow {
  user_id: string;
  session_id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  last_seen_at: string;
}

export function newSessionId(): string {
  return randomUUID();
}

/** True while the session is still recently active. */
export function isSessionFresh(row: Pick<ActiveSessionRow, 'last_seen_at'>): boolean {
  return Date.now() - new Date(row.last_seen_at).getTime() < SESSION_STALE_MS;
}

export async function getActiveSession(
  admin: SupabaseClient,
  userId: string,
): Promise<ActiveSessionRow | null> {
  const { data } = await admin
    .from('active_sessions')
    .select('user_id, session_id, user_agent, ip, created_at, last_seen_at')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as ActiveSessionRow) ?? null;
}

/** Create or replace the user's single session row. */
export async function registerSession(
  admin: SupabaseClient,
  userId: string,
  sessionId: string,
  userAgent: string | null,
  ip: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  await admin.from('active_sessions').upsert(
    {
      user_id: userId,
      session_id: sessionId,
      user_agent: userAgent,
      ip,
      created_at: now,
      last_seen_at: now,
    },
    { onConflict: 'user_id' },
  );
}

/** Refresh last_seen_at, throttled so we don't write on every single request. */
export async function touchSession(
  admin: SupabaseClient,
  userId: string,
  lastSeenAt: string,
): Promise<void> {
  if (Date.now() - new Date(lastSeenAt).getTime() < HEARTBEAT_MS) return;
  await admin
    .from('active_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', userId);
}

/** Remove the session row entirely (logout, or freeing the slot). */
export async function clearSession(admin: SupabaseClient, userId: string): Promise<void> {
  await admin.from('active_sessions').delete().eq('user_id', userId);
}

type CookieStore = {
  set: (name: string, value: string, options?: Record<string, unknown>) => void;
  get: (name: string) => { value: string } | undefined;
};

const baseCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});

/** Session-only cookie (no maxAge/expires) so it dies when the browser closes. */
export function setSessionCookie(store: CookieStore, sessionId: string): void {
  store.set(SESSION_COOKIE, sessionId, baseCookieOptions());
}

export function clearSessionCookie(store: CookieStore): void {
  store.set(SESSION_COOKIE, '', { ...baseCookieOptions(), maxAge: 0 });
}

export function readSessionCookie(store: CookieStore): string | null {
  return store.get(SESSION_COOKIE)?.value ?? null;
}
