import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { assembleProject } from '@/lib/db';
import { guard } from '@/lib/auth';
import { ProjectUpdateSchema, parseBody } from '@/lib/validation';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data: row } = await supabase.from('projects').select('*').eq('id', id).single();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(await assembleProject(supabase, row));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const parsed = await parseBody(req, ProjectUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = await createServerSupabase();
  const { data: row, error } = await supabase
    .from('projects')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(await assembleProject(supabase, row));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const supabase = await createServerSupabase();
  await supabase.from('projects').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
