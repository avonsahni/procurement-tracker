import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

// GET /api/platform/orgs/[id]/audit — last 500 activity entries for one org.
// Platform-admin only; reads via the service-role client (bypasses RLS) so a
// super admin can see any organisation's activity feed.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const { id: orgId } = await params;
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from('org_audit_log')
    .select('id, user_name, action, category, entity_name, details, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
