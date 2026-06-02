import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { addOrgAuditEntry } from '@/lib/db';
import { OrgRegistrationUpdateSchema, parseBody } from '@/lib/validation';

// Columns an org admin is allowed to read/write on their own organisation.
const REG_FIELDS = [
  'contact_name', 'contact_title', 'contact_email', 'phone', 'org_type',
  'website', 'address_line1', 'city', 'state_region', 'country',
] as const;

// GET /api/admin/organization — the caller's own org registration details
export async function GET() {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('organizations')
    .select(`id, name, ${REG_FIELDS.join(', ')}`)
    .eq('id', auth.orgId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });

  return NextResponse.json(data);
}

// PUT /api/admin/organization — update the caller's own org registration details
export async function PUT(req: NextRequest) {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(req, OrgRegistrationUpdateSchema);
  if (!parsed.ok) return parsed.response;

  // Normalise empty strings to null and only include known fields.
  const updates: Record<string, string | null> = {};
  for (const key of REG_FIELDS) {
    const v = (parsed.data as Record<string, unknown>)[key];
    if (v !== undefined) updates[key] = v === '' ? null : (v as string | null);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { error } = await admin
    .from('organizations')
    .update(updates)
    .eq('id', auth.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await addOrgAuditEntry(admin, auth.orgId, auth.id, auth.fullName,
    'Organisation Details Updated', 'settings');

  return NextResponse.json({ ok: true });
}
