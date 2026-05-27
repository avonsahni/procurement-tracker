import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { CompanyUpdateSchema, parseBody } from '@/lib/validation';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) {
    return NextResponse.json({ name: 'Procurement Dashboard', tagline: 'Enterprise Source of Truth' });
  }

  const admin = createAdminSupabase();
  const { data: row } = await admin
    .from('company_info')
    .select('*')
    .eq('org_id', user.orgId)
    .maybeSingle();

  if (!row) return NextResponse.json({ name: 'Procurement Dashboard', tagline: 'Enterprise Source of Truth' });
  return NextResponse.json({
    name: row.name,
    tagline: row.tagline || '',
    logoUrl: row.logo_url || undefined,
    contactEmail: row.contact_email || undefined,
    primaryColor: row.primary_color || undefined,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(req, CompanyUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, tagline, logoUrl, contactEmail, primaryColor } = parsed.data;

  const admin = createAdminSupabase();

  // Update org-level company info; insert if missing (shouldn't happen post-migration)
  const { data: existing } = await admin
    .from('company_info')
    .select('user_id')
    .eq('org_id', auth.orgId)
    .maybeSingle();

  if (existing) {
    await admin.from('company_info').update({
      name, tagline,
      logo_url: logoUrl ?? null,
      contact_email: contactEmail ?? null,
      primary_color: primaryColor ?? null,
    }).eq('org_id', auth.orgId);
  } else {
    await admin.from('company_info').insert({
      user_id: auth.id,
      org_id: auth.orgId,
      name, tagline,
      logo_url: logoUrl ?? null,
      contact_email: contactEmail ?? null,
      primary_color: primaryColor ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
