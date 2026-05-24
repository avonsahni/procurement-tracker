import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { LoginSchema, parseBody } from '@/lib/validation';

export async function POST(req: NextRequest) {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, can_edit')
    .eq('id', data.user.id)
    .single();

  return NextResponse.json({
    id: data.user.id,
    username: data.user.email ?? '',
    fullName: profile?.full_name || data.user.email?.split('@')[0] || 'User',
    role: 'admin',
    canEdit: profile?.can_edit ?? true,
  });
}
