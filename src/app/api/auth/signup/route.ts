import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { SignupSchema, parseBody } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  // Rate limit: 5 registrations per IP per hour
  const ip = getClientIp(req);
  if (!checkRateLimit(`signup:${ip}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 });
  }

  const parsed = await parseBody(req, SignupSchema);
  if (!parsed.ok) return parsed.response;
  const { email, password, fullName, orgName } = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Name the org after what they entered (trigger creates it as 'My Organization' by default)
  if (data.user && orgName && orgName !== 'My Organization') {
    const admin = createAdminSupabase();
    const { data: membership } = await admin
      .from('organization_members')
      .select('org_id')
      .eq('user_id', data.user.id)
      .single();
    if (membership?.org_id) {
      await admin.from('organizations').update({ name: orgName }).eq('id', membership.org_id);
      // Also update the company display name to match
      await admin.from('company_info').update({ name: orgName }).eq('org_id', membership.org_id);
    }
  }

  if (!data.session) {
    return NextResponse.json({
      needsConfirmation: true,
      message: 'Check your inbox to confirm your email before signing in.',
    });
  }

  return NextResponse.json({
    id: data.user!.id,
    username: data.user!.email ?? '',
    fullName,
    role: 'admin',
    canEdit: true,
  });
}
