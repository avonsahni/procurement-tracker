import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { addAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { DocumentCreateSchema, parseBody } from '@/lib/validation';
import { storageLimitForPlan, humanBytes } from '@/lib/storageLimit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const parsed = await parseBody(req, DocumentCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, size, sizeBytes, type, storagePath } = parsed.data;

  const supabase = await createServerSupabase();
  const { data: pkg } = await supabase.from('packages').select('id').eq('id', pkgId).single();
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  // ── Storage quota check ──────────────────────────────────────────────────
  if (sizeBytes > 0) {
    const admin = createAdminSupabase();
    const { data: usage } = await admin
      .from('org_storage_bytes')
      .select('used_bytes')
      .eq('org_id', auth.orgId)
      .maybeSingle();

    const usedBytes = Number((usage as any)?.used_bytes ?? 0);
    const limitBytes = storageLimitForPlan(auth.orgPlan);
    if (usedBytes + sizeBytes > limitBytes) {
      const remaining = Math.max(0, limitBytes - usedBytes);
      return NextResponse.json({
        error: `Storage limit reached. Your organisation has used ${humanBytes(usedBytes)} of the ${humanBytes(limitBytes)} limit. `
          + `This file is ${humanBytes(sizeBytes)} but only ${humanBytes(remaining)} remains.`,
        code: 'STORAGE_LIMIT_REACHED',
        usedBytes,
        limitBytes,
        remainingBytes: remaining,
        fileSizeBytes: sizeBytes,
      }, { status: 402 });
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const { data: row, error } = await supabase
    .from('documents')
    .insert({ package_id: pkgId, name, size, size_bytes: sizeBytes, type, username: auth.fullName, storage_path: storagePath })
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  await addAuditEntry(supabase, pkgId, auth.fullName, 'Document Added', '', name);

  return NextResponse.json({
    id: row.id, name: row.name, size: row.size || '', type: row.type || '',
    uploadedBy: row.username, uploadedAt: row.uploaded_at, storagePath: row.storage_path || '',
  }, { status: 201 });
}
