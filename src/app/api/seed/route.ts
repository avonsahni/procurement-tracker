import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { guard } from '@/lib/auth';
import { addOrgAuditEntry } from '@/lib/db';
import { seedSampleData } from '@/lib/seed-data';

export async function POST() {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServerSupabase();

  // Don't seed if projects already exist
  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', auth.orgId);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ ok: false, seeded: false, message: 'Projects already exist' }, { status: 409 });
  }

  const result = await seedSampleData(supabase, auth.id, auth.orgId);

  const admin = createAdminSupabase();
  await addOrgAuditEntry(admin, auth.orgId, auth.id, auth.fullName,
    'Sample Data Loaded', 'admin');

  return NextResponse.json({ ok: true, ...result });
}
