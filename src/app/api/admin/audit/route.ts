import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { withRoute } from '@/lib/withRoute';

// GET /api/admin/audit — returns last 500 org audit log entries, admin only.
// Uses 'user' guard so audit log remains readable even for expired orgs,
// then manually verifies admin role.
export const GET = withRoute(async () => {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;
  if (!['owner', 'admin'].includes(auth.orgRole)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from('org_audit_log')
    .select('id, user_name, action, category, entity_name, details, created_at')
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}, { route: '/api/admin/audit' });
