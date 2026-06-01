import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { guard } from '@/lib/auth';
import { addOrgAuditEntry } from '@/lib/db';
import { seedSampleData } from '@/lib/seed-data';

// Load sample/demo projects into the current org.
export async function POST() {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServerSupabase();

  // Don't re-seed if sample data already exists (real projects are allowed alongside)
  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', auth.orgId)
    .eq('is_sample', true);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { ok: false, seeded: false, message: 'Sample data already loaded' },
      { status: 409 }
    );
  }

  const result = await seedSampleData(supabase, auth.id, auth.orgId);

  const admin = createAdminSupabase();
  await addOrgAuditEntry(admin, auth.orgId, auth.id, auth.fullName,
    'Sample Data Loaded', 'admin');

  return NextResponse.json({ ok: true, ...result });
}

// Delete ONLY sample/demo projects — never touches real user-created projects.
export async function DELETE() {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServerSupabase();

  // Delete only projects flagged as sample data for this org.
  // Cascade removes their packages, vendors, remarks, documents, audit, etc.
  const { data: deleted, error } = await supabase
    .from('projects')
    .delete()
    .eq('org_id', auth.orgId)
    .eq('is_sample', true)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const removed = (deleted || []).length;

  const admin = createAdminSupabase();
  await addOrgAuditEntry(admin, auth.orgId, auth.id, auth.fullName,
    'Sample Data Deleted', 'admin', undefined,
    { projectsRemoved: removed });

  return NextResponse.json({ ok: true, projectsRemoved: removed });
}
