import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { guard } from '@/lib/auth';
import { addOrgAuditEntry } from '@/lib/db';
import { CategoryCreateSchema, parseBody } from '@/lib/validation';

export async function GET() {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();
  const { data } = await admin
    .from('categories')
    .select('name')
    .eq('org_id', auth.orgId)
    .order('name');

  return NextResponse.json((data || []).map((r: any) => r.name));
}

export async function POST(req: NextRequest) {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(req, CategoryCreateSchema);
  if (!parsed.ok) return parsed.response;

  const admin = createAdminSupabase();
  const { error } = await admin
    .from('categories')
    .insert({ user_id: auth.id, org_id: auth.orgId, name: parsed.data.name });

  if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await addOrgAuditEntry(admin, auth.orgId, auth.id, auth.fullName,
    'Category Added', 'settings', parsed.data.name);

  return NextResponse.json({ ok: true }, { status: 201 });
}
