import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { logPackageAudit } from '@/lib/db';
import { guard } from '@/lib/auth';
import { RemarkCreateSchema, parseBody } from '@/lib/validation';
import { assertProjectActive } from '@/lib/projectGuard';
import { findRecentDuplicate } from '@/lib/dedupe';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const parsed = await parseBody(req, RemarkCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { text, imageUrls, imageBytes } = parsed.data;

  const supabase = await createServerSupabase();
  const { data: pkg } = await supabase.from('packages').select('id, project_id').eq('id', pkgId).single();
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const g = await assertProjectActive(supabase, pkg.project_id, auth);
  if (g) return g;

  // Dedup guard: same text from same user within 10 s is a double-submit.
  const dup = await findRecentDuplicate(
    supabase, 'remarks',
    { package_id: pkgId, user_id: auth.id, text },
    { timeColumn: 'timestamp' },
  );
  if (dup) {
    return NextResponse.json({
      id: dup.id, user: dup.username, text: dup.text, timestamp: dup.timestamp,
      imageUrls: dup.image_urls ?? [],
    }, { status: 201 });
  }

  const { data: row, error } = await supabase
    .from('remarks')
    .insert({ package_id: pkgId, username: auth.fullName, text, user_id: auth.id, image_urls: imageUrls ?? [], image_bytes: imageBytes ?? 0 })
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  await logPackageAudit(createAdminSupabase(), auth, pkgId, 'Remark Posted', 'remark', {
    preview: String(text).slice(0, 80),
  });

  return NextResponse.json({
    id: row.id, user: row.username, text: row.text, timestamp: row.timestamp,
    imageUrls: row.image_urls ?? [],
  }, { status: 201 });
}
