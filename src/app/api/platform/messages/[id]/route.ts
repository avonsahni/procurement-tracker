import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

// PATCH /api/platform/messages/[id] — toggle read/unread
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { is_read } = await req.json();

  const admin = createAdminSupabase();
  const { error } = await admin
    .from('contact_messages')
    .update({ is_read })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/platform/messages/[id] — permanently delete a message
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const admin = createAdminSupabase();
  const { error } = await admin.from('contact_messages').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
