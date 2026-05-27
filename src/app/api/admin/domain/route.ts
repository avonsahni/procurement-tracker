import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { addOrgAuditEntry } from '@/lib/db';

/**
 * GET  /api/admin/domain — returns the org's current email_domain restriction
 * PATCH /api/admin/domain — updates (or clears) the restriction; org admin only
 */

export async function GET() {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();
  const { data: org, error } = await admin
    .from('organizations')
    .select('email_domain')
    .eq('id', auth.orgId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ emailDomain: org?.email_domain ?? null });
}

export async function PATCH(req: NextRequest) {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  let body: { emailDomain?: string | null };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate domain format (allow null/empty to clear the restriction)
  const raw = typeof body.emailDomain === 'string' ? body.emailDomain.trim().toLowerCase() : null;
  const domain = raw || null;

  if (domain !== null) {
    // Basic domain format check — no @ sign, at least one dot, no spaces
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({
        error: 'Invalid domain format. Enter a domain like "acme.com" without the @ sign.',
      }, { status: 400 });
    }
  }

  const admin = createAdminSupabase();

  // Fetch current value for audit log
  const { data: current } = await admin
    .from('organizations')
    .select('email_domain')
    .eq('id', auth.orgId)
    .single();

  const { error } = await admin
    .from('organizations')
    .update({ email_domain: domain })
    .eq('id', auth.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await addOrgAuditEntry(
    admin, auth.orgId, auth.id, auth.fullName,
    domain ? 'Domain Restriction Updated' : 'Domain Restriction Removed',
    'admin',
    domain ?? undefined,
    {
      previous: current?.email_domain ?? null,
      new: domain,
    }
  );

  return NextResponse.json({ emailDomain: domain });
}
