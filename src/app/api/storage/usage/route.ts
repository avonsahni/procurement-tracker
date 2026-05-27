import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { ORG_STORAGE_LIMIT_BYTES, humanBytes, storagePct } from '@/lib/storageLimit';
import { withRoute } from '@/lib/withRoute';

export const GET = withRoute(async () => {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();
  const { data: usage } = await admin
    .from('org_storage_bytes')
    .select('used_bytes')
    .eq('org_id', auth.orgId)
    .maybeSingle();

  const usedBytes = Number((usage as any)?.used_bytes ?? 0);
  const limitBytes = ORG_STORAGE_LIMIT_BYTES;
  const remainingBytes = Math.max(0, limitBytes - usedBytes);
  const pct = storagePct(usedBytes, limitBytes);

  return NextResponse.json({
    usedBytes,
    limitBytes,
    remainingBytes,
    pct,
    usedLabel: humanBytes(usedBytes),
    limitLabel: humanBytes(limitBytes),
    remainingLabel: humanBytes(remainingBytes),
  });
}, { route: '/api/storage/usage' });
