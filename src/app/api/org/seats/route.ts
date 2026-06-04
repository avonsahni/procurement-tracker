import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { withRoute } from '@/lib/withRoute';

export const GET = withRoute(async () => {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();
  const [orgRes, countRes] = await Promise.all([
    admin.from('organizations').select('seat_count, plan').eq('id', auth.orgId).single(),
    admin.from('organization_members').select('*', { count: 'exact', head: true }).eq('org_id', auth.orgId),
  ]);

  const seatCount   = (orgRes.data as any)?.seat_count as number | null ?? null;
  const memberCount = countRes.count ?? 0;

  return NextResponse.json({ seatCount, memberCount });
}, { route: '/api/org/seats' });
