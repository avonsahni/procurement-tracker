import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { assembleProject, assembleProjectSummary } from '@/lib/db';
import { guard } from '@/lib/auth';
import { ProjectCreateSchema, parseBody } from '@/lib/validation';

export async function GET() {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServerSupabase();
  const { data: rows, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Use the slim summary (no vendors/remarks/docs/audit/invoices) — the
  // dashboard only needs stage, awardValue, and category per package.
  const projects = await Promise.all((rows || []).map(r => assembleProjectSummary(supabase, r)));
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;
  const parsed = await parseBody(req, ProjectCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, client, budget } = parsed.data;

  const supabase = await createServerSupabase();
  const { data: row, error } = await supabase
    .from('projects')
    .insert({ owner_id: auth.id, org_id: auth.orgId, name, client, budget, status: 'Active' })
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  return NextResponse.json(await assembleProjectSummary(supabase, row), { status: 201 });
}
