import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { seedSampleData } from '@/lib/seed-data';

// Platform admin: wipe all project data then reload the standard sample dataset.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id: orgId } = await params;
  const admin = createAdminSupabase();

  // Find the org owner to use as the seed author
  const { data: ownerRow } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle();

  if (!ownerRow?.user_id) {
    return NextResponse.json({ error: 'No owner found for this org' }, { status: 400 });
  }

  // Wipe existing projects first so seedSampleData's idempotency guard doesn't block it
  await admin.from('projects').delete().eq('org_id', orgId);

  // Seed fresh sample data
  await seedSampleData(admin, ownerRow.user_id, orgId);

  return NextResponse.json({ ok: true });
}
