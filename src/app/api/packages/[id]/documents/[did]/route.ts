import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { addAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; did: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId, did } = await params;
  const supabase = await createServerSupabase();
  const { data: doc } = await supabase.from('documents').select('name').eq('id', did).single();
  if (doc) await addAuditEntry(supabase, pkgId, auth.fullName, 'Document Removed', doc.name, '');
  await supabase.from('documents').delete().eq('id', did);
  return NextResponse.json({ ok: true });
}
