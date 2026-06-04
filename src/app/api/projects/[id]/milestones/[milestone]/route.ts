import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { guard } from '@/lib/auth';
import { EXECUTION_MILESTONES, milestoneProgressFromTasks } from '@/lib/types';

// GET /api/projects/[id]/milestones/[milestone]
// Returns every package in the project alongside the tasks belonging to the
// given execution milestone — powers the "milestone across all packages" page.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; milestone: string }> },
) {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const { id: projectId, milestone: rawMilestone } = await params;
  const milestone = decodeURIComponent(rawMilestone);

  if (!(EXECUTION_MILESTONES as readonly string[]).includes(milestone)) {
    return NextResponse.json({ error: 'Unknown milestone' }, { status: 400 });
  }

  // Use the admin client throughout — guard() already validated auth and gave us
  // auth.orgId, so we authorise by filtering on org_id rather than relying on
  // RLS (which requires a user-session client and adds JWT-parse overhead).
  const admin = createAdminSupabase();

  // Project visibility check and packages list run in parallel.
  const [projectRes, pkgRes] = await Promise.all([
    admin.from('projects')
      .select('id, name, client, status')
      .eq('id', projectId)
      .eq('org_id', auth.orgId)
      .maybeSingle(),
    admin.from('packages')
      .select('id, name, category, current_stage')
      .eq('project_id', projectId)
      .order('created_at'),
  ]);

  if (!projectRes.data) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  const packages = pkgRes.data || [];

  // Tasks for this specific milestone across all packages in the project.
  let tasksByPkg: Record<string, any[]> = {};
  if (packages.length > 0) {
    const { data: tasks } = await admin
      .from('milestone_tasks')
      .select('id, package_id, name, description, progress, start_date, end_date, sort_order, created_by, created_at')
      .in('package_id', packages.map(p => p.id))
      .eq('milestone_name', milestone)
      .order('sort_order')
      .order('created_at');
    for (const t of tasks || []) {
      (tasksByPkg[t.package_id] || (tasksByPkg[t.package_id] = [])).push(t);
    }
  }

  const result = packages.map(p => {
    const tasks = tasksByPkg[p.id] || [];
    return {
      id: p.id,
      name: p.name,
      category: p.category || '',
      currentStage: p.current_stage,
      progress: milestoneProgressFromTasks(tasks.map(t => Number(t.progress || 0))),
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || undefined,
        progress: Number(t.progress || 0),
        startDate: t.start_date || undefined,
        endDate: t.end_date || undefined,
        createdBy: t.created_by || undefined,
        createdAt: t.created_at,
      })),
    };
  });

  return NextResponse.json({
    projectId: projectRes.data.id,
    projectName: projectRes.data.name,
    client: projectRes.data.client || '',
    status: projectRes.data.status,
    milestone,
    packages: result,
  });
}
