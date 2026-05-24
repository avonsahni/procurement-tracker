import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { CategoryUpdateSchema, parseBody } from '@/lib/validation';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { name: rawOld } = await params;
  const oldName = decodeURIComponent(rawOld);
  const parsed = await parseBody(req, CategoryUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const newName = parsed.data.name;

  const supabase = await createServerSupabase();
  await supabase.from('categories').update({ name: newName }).eq('user_id', auth.id).eq('name', oldName);
  // Update package.category labels owned by this user
  const { data: projects } = await supabase.from('projects').select('id').eq('owner_id', auth.id);
  const ids = (projects || []).map(p => p.id);
  if (ids.length) {
    await supabase.from('packages').update({ category: newName }).in('project_id', ids).eq('category', oldName);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const { name } = await params;
  const supabase = await createServerSupabase();
  await supabase.from('categories').delete().eq('user_id', auth.id).eq('name', decodeURIComponent(name));
  return NextResponse.json({ ok: true });
}
