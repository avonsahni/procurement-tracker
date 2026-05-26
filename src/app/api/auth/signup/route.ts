import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { SignupSchema, parseBody } from '@/lib/validation';

export async function POST(req: NextRequest) {
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

  // Name the org after what they entered (trigger creates it as 'My Organisation' by default)
  if (data.user && orgName && orgName !== 'My Organisation') {
    const admin = createAdminSupabase();
    const { data: membership } = await admin
      .from('organization_members')
      .select('org_id')
      .eq('user_id', data.user.id)
      .single();
    if (membership?.org_id) {
      await admin.from('organizations').update({ name: orgName }).eq('id', membership.org_id);
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
