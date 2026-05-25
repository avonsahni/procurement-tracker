import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { guard } from '@/lib/auth';
import { CompanyUpdateSchema, parseBody } from '@/lib/validation';

export async function GET() {
  // Public default for the login screen; per-user once authenticated.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ name: 'Procurement Dashboard', tagline: 'Enterprise Source of Truth' });
  }
  const supabase = await createServerSupabase();
  const { data: row } = await supabase
    .from('company_info')
    .select('*')
    .eq('user_id', user.id)
    .single();

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
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const parsed = await parseBody(req, CompanyUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, tagline, logoUrl, contactEmail, primaryColor } = parsed.data;

  const supabase = await createServerSupabase();
  await supabase
    .from('company_info')
    .upsert({
      user_id: auth.id,
      name,
      tagline,
      logo_url: logoUrl || null,
      contact_email: contactEmail || null,
      primary_color: primaryColor || null,
    }, { onConflict: 'user_id' });
  return NextResponse.json({ ok: true });
}
