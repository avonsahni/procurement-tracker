import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

// GET /api/platform/messages — list all contact enquiries (platform admin only)
export async function GET() {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('contact_messages')
    .select('id, name, email, phone, company, message, is_read, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
