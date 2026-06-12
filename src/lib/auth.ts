import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getActiveSession, touchSession, readSessionCookie, newSessionId, registerSession, setSessionCookie } from '@/lib/session';

export type OrgStatus = 'trial' | 'active' | 'paused' | 'canceled';
export type OrgPlan  = 'trial' | 'starter' | 'pro' | 'enterprise';


export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user' | 'viewer';
  canEdit: boolean;
  orgId: string;
  orgRole: 'owner' | 'admin' | 'viewer';
  isPlatformAdmin: boolean;
  /** Current subscription/lifecycle status of the org */
  orgStatus: OrgStatus;
  /** Billing plan for the org */
  orgPlan: OrgPlan;
  /** ISO timestamp when trial ends; null if not on trial */
  trialEndsAt: string | null;
};

/**
 * Confirms the request's session cookie still owns the user's single active
 * session. Refreshes the heartbeat on success so an active device keeps its slot.
 *
 * Three outcomes:
 *   • No row in active_sessions → slot is free; auto-enroll this device and
 *     allow. Handles pre-migration sessions, post-inactivity-timeout re-entry,
 *     and future deployments without disrupting logged-in users.
 *   • Row exists, cookie matches → valid owner; touch heartbeat and allow.
 *   • Row exists, cookie mismatch → another device holds the slot; block.
 */
async function ownsActiveSession(userId: string): Promise<boolean> {
  const admin = createAdminSupabase();
  const session = await getActiveSession(admin, userId);

  if (!session) {
    // Slot is free — silently claim it for this device so the user is not
    // disrupted. This is safe: if two requests race here, both write the same
    // user_id (upsert on PK) and the last writer wins, which is fine.
    const sessionId = newSessionId();
    const cookieStore = await cookies();
    await registerSession(admin, userId, sessionId, null, null);
    setSessionCookie(cookieStore, sessionId);
    return true;
  }

  const cookieStore = await cookies();
  const cookieId = readSessionCookie(cookieStore);
  if (!cookieId || cookieId !== session.session_id) return false;

  await touchSession(admin, userId, session.last_seen_at);
  return true;
}

/**
 * Loads the full AuthUser WITHOUT enforcing single-session ownership.
 * Used by the login/signup flow, which establishes the session itself.
 */
export async function getSessionUserUnchecked(): Promise<AuthUser | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return assembleAuthUser(user.id, user.email ?? '');
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Single-active-session gate runs concurrently with profile assembly — the
  // session check only gates the result, it doesn't feed into it, so there's
  // no need to pay for two sequential round trips.
  const [owns, authUser] = await Promise.all([
    ownsActiveSession(user.id),
    assembleAuthUser(user.id, user.email ?? ''),
  ]);
  if (!owns) return null;

  return authUser;
}

async function assembleAuthUser(userId: string, email: string): Promise<AuthUser> {
  const admin = createAdminSupabase();

  // Two parallel queries instead of three sequential ones:
  //   1. profiles — user settings
  //   2. organization_members joined with organizations — role + plan in one round trip
  const [{ data: profile, error: profileErr }, { data: memberships, error: memErr }] = await Promise.all([
    admin.from('profiles')
      .select('full_name, can_edit, is_platform_admin')
      .eq('id', userId)
      .maybeSingle(),
    admin.from('organization_members')
      .select('org_id, role, organizations(subscription_status, trial_ends_at, plan)')
      .eq('user_id', userId),
  ]);

  if (profileErr) console.error('[getCurrentUser] profile error:', profileErr.message);
  if (memErr) console.error('[getCurrentUser] membership error:', memErr.message);

  // Pick highest-privilege membership: owner > admin > viewer
  const priority = { owner: 0, admin: 1, viewer: 2 };
  const membership = (memberships || []).sort(
    (a, b) => (priority[a.role as keyof typeof priority] ?? 9) - (priority[b.role as keyof typeof priority] ?? 9)
  )[0] ?? null;

  const orgRole = (membership?.role as 'owner' | 'admin' | 'viewer') ?? 'viewer';

  // Org data comes from the joined select — no extra round trip needed
  const org = membership ? (membership as any).organizations : null;
  const orgStatus   = (org?.subscription_status as OrgStatus) ?? 'active';
  const orgPlan     = (org?.plan              as OrgPlan)     ?? 'trial';
  const trialEndsAt = org?.trial_ends_at ?? null;

  const canEdit = profile?.can_edit ?? true;
  const isOrgAdmin = orgRole === 'owner' || orgRole === 'admin';
  const role: 'admin' | 'user' | 'viewer' = isOrgAdmin ? 'admin' : canEdit ? 'user' : 'viewer';

  return {
    id: userId,
    email,
    fullName: profile?.full_name || email.split('@')[0] || 'User',
    role,
    canEdit,
    orgId: membership?.org_id ?? '',
    orgRole,
    isPlatformAdmin: profile?.is_platform_admin ?? false,
    orgStatus,
    orgPlan,
    trialEndsAt,
  };
}

/**
 * Returns true if the org's subscription is blocked (paused, canceled, or trial expired).
 * Platform admins always bypass subscription checks.
 */
export function isOrgBlocked(user: AuthUser): boolean {
  if (user.isPlatformAdmin) return false;
  if (user.orgStatus === 'paused' || user.orgStatus === 'canceled') return true;
  if (user.orgStatus === 'trial' && user.trialEndsAt) {
    return new Date(user.trialEndsAt) < new Date();
  }
  return false;
}

/**
 * Route guard. Returns the user, or a NextResponse to short-circuit the handler.
 * Roles:
 *   - 'user'   — any authenticated user
 *   - 'editor' — must have can_edit=true
 *   - 'admin'  — must be org owner or admin
 *   - 'platform' — must be platform super-admin
 *
 * 'user' role is always allowed through even when the org is expired/blocked,
 * so read endpoints remain accessible. 'editor' and 'admin' are blocked
 * when the org is expired — this covers all mutation routes.
 */
export async function guard(role: 'user' | 'editor' | 'admin' | 'platform'): Promise<NextResponse | AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Subscription check — platform admins bypass, platform-role routes bypass.
  // 'user' role is always allowed (read-only data access still works when expired).
  // 'editor' and 'admin' roles are blocked when the org is expired/paused/canceled,
  // so all mutation routes reject while reads continue to function.
  if (role !== 'platform' && role !== 'user' && isOrgBlocked(user)) {
    const reason =
      user.orgStatus === 'paused' ? 'Your organisation has been paused. Please contact support.' :
      user.orgStatus === 'canceled' ? 'Your subscription has been canceled.' :
      'Your free trial has expired. Upgrade your plan to continue.';
    return NextResponse.json({ error: reason, code: 'ORG_BLOCKED' }, { status: 402 });
  }

  if (role === 'editor' && !user.canEdit) {
    return NextResponse.json({ error: 'Edit permission required' }, { status: 403 });
  }
  if (role === 'admin' && !['owner', 'admin'].includes(user.orgRole)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  if (role === 'platform' && !user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Platform access required' }, { status: 403 });
  }
  return user;
}
