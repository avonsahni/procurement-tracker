import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

// GET /api/admin/audit — returns last 200 org audit log entries, admin only.
export async function GET() {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from('org_audit_log')
    .select('id, user_name, action, category, entity_name, details, created_at')
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
