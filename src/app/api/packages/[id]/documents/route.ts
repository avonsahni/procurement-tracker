import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { addAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { DocumentCreateSchema, parseBody } from '@/lib/validation';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const parsed = await parseBody(req, DocumentCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, size, type } = parsed.data;

  const supabase = await createServerSupabase();
  const { data: pkg } = await supabase.from('packages').select('id').eq('id', pkgId).single();
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const { data: row, error } = await supabase
    .from('documents')
    .insert({ package_id: pkgId, name, size, type, username: auth.fullName })
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  await addAuditEntry(supabase, pkgId, auth.fullName, 'Document Added', '', name);

  return NextResponse.json({
    id: row.id, name: row.name, size: row.size || '', type: row.type || '',
    uploadedBy: row.username, uploadedAt: row.uploaded_at,
  }, { status: 201 });
}
