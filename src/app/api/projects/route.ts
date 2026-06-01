import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { assembleProject, assembleProjectSummary, assembleBatchProjectSummaries, addOrgAuditEntry } from '@/lib/db';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { ProjectCreateSchema, parseBody } from '@/lib/validation';
import { withRoute } from '@/lib/withRoute';

export const GET = withRoute(async () => {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServerSupabase();
  const { data: rows, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Batch assembly: 4 total DB queries regardless of project count (previously N×4)
  const projects = await assembleBatchProjectSummaries(supabase, rows || []);
  return NextResponse.json(projects);
}, { route: '/api/projects' });

export const POST = withRoute(async (req: NextRequest) => {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;
  const parsed = await parseBody(req, ProjectCreateSchema);
  if (!parsed.ok) return parsed.response;
  const {
    name, client, budget,
    address, projectType, builtUpArea, estimatedStartDate, estimatedDurationMonths,
    tenderedCost, projectManager, clientContactName, clientContactEmail,
    clientContactPhone, projectRemarks,
  } = parsed.data;

  const supabase = await createServerSupabase();
  const { data: row, error } = await supabase
    .from('projects')
    .insert({
      owner_id: auth.id, org_id: auth.orgId, name, client, budget, status: 'Active',
      address:                  address                  || '',
      project_type:             projectType              || '',
      built_up_area:            builtUpArea              || '',
      estimated_start_date:     estimatedStartDate       || null,
      estimated_duration_months: estimatedDurationMonths ?? null,
      tendered_cost:            tenderedCost             ?? null,
      project_manager:          projectManager           || '',
      client_contact_name:      clientContactName        || '',
      client_contact_email:     clientContactEmail       || '',
      client_contact_phone:     clientContactPhone       || '',
      project_remarks:          projectRemarks           || '',
    })
    .select()
    .single();

  if (error || !row) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });

  const adminClient = createAdminSupabase();
  await addOrgAuditEntry(adminClient, auth.orgId, auth.id, auth.fullName,
    'Project Created', 'project', name,
    { client, budget, projectType });

  return NextResponse.json(await assembleProjectSummary(supabase, row), { status: 201 });
}, { route: '/api/projects' });
