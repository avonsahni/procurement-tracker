import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getSessionUserUnchecked } from '@/lib/auth';
import {
  getActiveSession, isSessionFresh, registerSession,
  newSessionId, setSessionCookie, readSessionCookie,
} from '@/lib/session';
import { LoginSchema, parseBody } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per IP per minute
  const ip = getClientIp(req);
  if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
  }

  const parsed = await parseBody(req, LoginSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }
  const { email, password, transfer } = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // ── Single-active-session gate ────────────────────────────────────────────
  const admin = createAdminSupabase();
  const cookieStore = await cookies();
  const existing = await getActiveSession(admin, data.user.id);
  const incomingSid = readSessionCookie(cookieStore);
  const isConflict = existing && isSessionFresh(existing) && existing.session_id !== incomingSid;

  if (isConflict && !transfer) {
    // Credentials are valid but a fresh session exists on another device.
    // Ask the client whether to transfer the session here.
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error: 'This account is already logged in on another device or browser.',
        code: 'SESSION_ACTIVE',
        canTransfer: true,
      },
      { status: 409 },
    );
  }
  // If transfer === true (user confirmed), fall through and overwrite the existing
  // session row, which kicks the other device on its next request.
  // ──────────────────────────────────────────────────────────────────────────

  // Claim the single session slot for this device.
  const sessionId = newSessionId();
  await registerSession(
    admin,
    data.user.id,
    sessionId,
    req.headers.get('user-agent'),
    ip,
  );
  setSessionCookie(cookieStore, sessionId);
  // ──────────────────────────────────────────────────────────────────────────

  // Assemble the response (session already established above, so skip the gate)
  const user = await getSessionUserUnchecked();
  if (!user) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }

  return NextResponse.json({
    id: user.id,
    username: user.email,
    fullName: user.fullName,
    role: user.role,
    canEdit: user.canEdit,
    orgId: user.orgId,
    orgRole: user.orgRole,
    isPlatformAdmin: user.isPlatformAdmin,
    orgStatus: user.orgStatus,
    orgPlan: user.orgPlan,
    trialEndsAt: user.trialEndsAt,
  });
}
