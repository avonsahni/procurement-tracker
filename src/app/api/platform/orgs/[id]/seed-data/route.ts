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

  // Find a member to use as the seed author — prefer owner, fall back to any member
  const { data: members } = await admin
    .from('organization_members')
    .select('user_id, role')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  const ownerRow =
    (members ?? []).find((m: any) => m.role === 'owner') ??
    (members ?? []).find((m: any) => m.role === 'admin') ??
    (members ?? [])[0] ?? null;

  if (!ownerRow?.user_id) {
    return NextResponse.json({ error: 'No members found for this org' }, { status: 400 });
  }

  // Wipe existing projects first so the idempotency guard in seedSampleData doesn't block
  const { error: wipeErr } = await admin.from('projects').delete().eq('org_id', orgId);
  if (wipeErr) return NextResponse.json({ error: `Wipe failed: ${wipeErr.message}` }, { status: 500 });

  // Seed fresh sample data
  const result = await seedSampleData(admin, ownerRow.user_id, orgId);

  if (!result || !(result as any).seeded) {
    return NextResponse.json({ error: 'Seed was skipped — projects may not have been wiped correctly' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result });
}
