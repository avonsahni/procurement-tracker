import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { RemarkCreateSchema, parseBody } from '@/lib/validation';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  const { id: pkgId } = await params;
  const parsed = await parseBody(req, RemarkCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { text, imageUrls } = parsed.data;

  const supabase = await createServerSupabase();
  const { data: pkg } = await supabase.from('packages').select('id').eq('id', pkgId).single();
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const { data: row, error } = await supabase
    .from('remarks')
    .insert({ package_id: pkgId, username: auth.fullName, text, user_id: auth.id, image_urls: imageUrls ?? [] })
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  return NextResponse.json({
    id: row.id, user: row.username, text: row.text, timestamp: row.timestamp,
    imageUrls: row.image_urls ?? [],
  }, { status: 201 });
}
