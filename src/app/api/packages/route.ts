import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { assemblePackage } from '@/lib/db';
import { guard } from '@/lib/auth';
import { PackageCreateSchema, parseBody } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const parsed = await parseBody(req, PackageCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { projectId, name, category, origin, currency } = parsed.data;

  const supabase = await createServerSupabase();

  // RLS will block this if the project isn't owned by the user
  const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).single();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const { data: row, error } = await supabase
    .from('packages')
    .insert({ project_id: projectId, name, description: '', category, origin, currency, current_stage: 'Spec Received' })
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  return NextResponse.json(await assemblePackage(supabase, row), { status: 201 });
}
