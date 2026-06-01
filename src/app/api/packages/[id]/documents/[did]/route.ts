import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { addAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { assertPackageProjectActive } from '@/lib/projectGuard';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; did: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId, did } = await params;
  const supabase = await createServerSupabase();
  const g = await assertPackageProjectActive(supabase, pkgId, auth);
  if (g) return g;

  const { data: doc } = await supabase
    .from('documents')
    .select('name, storage_path')
    .eq('id', did)
    .single();

  if (doc) {
    // Remove from Supabase Storage if we have a path
    if (doc.storage_path) {
      await supabase.storage.from('package-documents').remove([doc.storage_path]);
    }
    await addAuditEntry(supabase, pkgId, auth.fullName, 'Document Removed', doc.name, '');
  }

  await supabase.from('documents').delete().eq('id', did);
  return NextResponse.json({ ok: true });
}
