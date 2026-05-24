import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { UserUpdateSchema, parseBody } from '@/lib/validation';

// User can only update their own profile. role/password changes go through Supabase Auth directly.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (id !== auth.id) {
    return NextResponse.json({ error: 'Can only update your own profile' }, { status: 403 });
  }
  const parsed = await parseBody(req, UserUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const supabase = await createServerSupabase();
  const updates: Record<string, any> = {};
  if (body.fullName !== undefined) updates.full_name = body.fullName;
  if (body.canEdit !== undefined) updates.can_edit = body.canEdit;
  // role changes intentionally ignored — single-tenant-per-user means every user is admin of their workspace

  if (Object.keys(updates).length > 0) {
    await supabase.from('profiles').update(updates).eq('id', auth.id);
  }

  if (body.password) {
    const { error: pwErr } = await supabase.auth.updateUser({ password: body.password });
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 400 });
  }

  return NextResponse.json({
    id: auth.id,
    username: auth.email,
    fullName: body.fullName ?? auth.fullName,
    role: 'admin',
    canEdit: body.canEdit ?? auth.canEdit,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (id !== auth.id) {
    return NextResponse.json({ error: 'Account deletion only via Supabase Auth' }, { status: 403 });
  }
  return NextResponse.json({ error: 'Account deletion requires Supabase admin API' }, { status: 501 });
}
