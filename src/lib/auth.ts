import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export type OrgStatus = 'trial' | 'active' | 'paused' | 'canceled';
export type OrgPlan  = 'trial' | 'starter' | 'pro' | 'enterprise';

/** Maximum users allowed per plan. Enterprise = unlimited (Number.MAX_SAFE_INTEGER). */
export const PLAN_USER_LIMITS: Record<OrgPlan, number> = {
  trial:      3,
  starter:    10,
  pro:        50,
  enterprise: Number.MAX_SAFE_INTEGER,
};

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user';
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

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminSupabase();

  const [{ data: profile, error: profileErr }, { data: memberships, error: memErr }] = await Promise.all([
    admin.from('profiles').select('full_name, can_edit, is_platform_admin').eq('id', user.id).maybeSingle(),
    admin.from('organization_members').select('org_id, role').eq('user_id', user.id),
  ]);

  if (profileErr) console.error('[getCurrentUser] profile error:', profileErr.message);
  if (memErr) console.error('[getCurrentUser] membership error:', memErr.message);

  // Pick highest-privilege membership: owner > admin > viewer
  const priority = { owner: 0, admin: 1, viewer: 2 };
  const membership = (memberships || []).sort(
    (a, b) => (priority[a.role as keyof typeof priority] ?? 9) - (priority[b.role as keyof typeof priority] ?? 9)
  )[0] ?? null;

  console.log('[getCurrentUser] user=%s memberships=%d role=%s orgId=%s',
    user.email, (memberships || []).length, membership?.role, membership?.org_id);

  const orgRole = (membership?.role as 'owner' | 'admin' | 'viewer') ?? 'viewer';

  // Fetch org subscription status + plan if there's a membership
  let orgStatus: OrgStatus = 'active';
  let orgPlan: OrgPlan     = 'trial';
  let trialEndsAt: string | null = null;
  if (membership?.org_id) {
    const { data: org } = await admin
      .from('organizations')
      .select('subscription_status, trial_ends_at, plan')
      .eq('id', membership.org_id)
      .maybeSingle();
    if (org) {
      orgStatus   = (org.subscription_status as OrgStatus) ?? 'active';
      orgPlan     = (org.plan              as OrgPlan)     ?? 'trial';
      trialEndsAt = org.trial_ends_at ?? null;
    }
  }

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name || user.email?.split('@')[0] || 'User',
    role: orgRole === 'owner' || orgRole === 'admin' ? 'admin' : 'user',
    canEdit: profile?.can_edit ?? true,
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
