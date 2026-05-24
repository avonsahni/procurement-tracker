import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { SignupSchema, parseBody } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, SignupSchema);
  if (!parsed.ok) return parsed.response;
  const { email, password, fullName } = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If email confirmation is OFF in Supabase, the user is signed in immediately.
  // If ON, the user gets a confirmation email and session is null until they click it.
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
