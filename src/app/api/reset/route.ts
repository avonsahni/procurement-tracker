import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { guard } from '@/lib/auth';
import { addOrgAuditEntry } from '@/lib/db';

// Wipes the current org's projects (+ cascading packages/vendors/remarks/documents/audit).
// Categories and company_info are preserved.
export async function POST() {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServerSupabase();
  await supabase.from('projects').delete().eq('org_id', auth.orgId);

  const admin = createAdminSupabase();
  await addOrgAuditEntry(admin, auth.orgId, auth.id, auth.fullName,
    'Data Wiped', 'admin', undefined,
    { warning: 'All projects and packages permanently deleted' });

  return NextResponse.json({ ok: true });
}
