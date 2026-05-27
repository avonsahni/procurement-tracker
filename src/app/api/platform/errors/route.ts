import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * GET /api/platform/errors
 * Returns the last 200 error_log entries. Platform admin only.
 */
export async function GET() {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from('error_log')
    .select('id, created_at, level, source, route, message, stack, context, user_id, org_id')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
