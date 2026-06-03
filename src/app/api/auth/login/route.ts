import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
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
  const { email, password } = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Use getCurrentUser so the response includes org role correctly
  const user = await getCurrentUser();
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
