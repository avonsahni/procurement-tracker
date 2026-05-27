import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { SignupSchema, parseBody } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { seedSampleData } from '@/lib/seed-data';

export async function POST(req: NextRequest) {
  // Rate limit: 5 registrations per IP per hour
  const ip = getClientIp(req);
  if (!checkRateLimit(`signup:${ip}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 });
  }

  const parsed = await parseBody(req, SignupSchema);
  if (!parsed.ok) return parsed.response;

  const {
    email, password, fullName, jobTitle,
    orgName, orgType, website,
    addressLine1, city, stateRegion, country, phone,
  } = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.user) {
    const admin = createAdminSupabase();

    // The DB trigger creates the org synchronously — fetch its id
    const { data: membership } = await admin
      .from('organization_members')
      .select('org_id')
      .eq('user_id', data.user.id)
      .single();

    if (membership?.org_id) {
      // Extract domain from admin email — e.g. "tata.com" from "jane@tata.com"
      const emailDomain = email.split('@')[1]?.toLowerCase() ?? null;

      // Update organisation with all registration details
      await admin.from('organizations').update({
        name:          orgName || 'My Organisation',
        org_type:      orgType      || null,
        website:       website      || null,
        address_line1: addressLine1 || null,
        city:          city         || null,
        state_region:  stateRegion  || null,
        country:       country      || null,
        phone:         phone        || null,
        contact_name:  fullName,
        contact_title: jobTitle     || null,
        contact_email: email,
        email_domain:  emailDomain,
      }).eq('id', membership.org_id);

      // Keep company_info display name in sync
      await admin.from('company_info')
        .update({ name: orgName || 'My Organisation' })
        .eq('org_id', membership.org_id);
    }

    // Store job title on profile
    if (jobTitle) {
      await admin.from('profiles')
        .update({ job_title: jobTitle })
        .eq('id', data.user.id);
    }

    // Seed sample projects for the new org so the dashboard isn't empty on first login
    await seedSampleData(admin, data.user.id);
  }

  if (!data.session) {
    return NextResponse.json({
      needsConfirmation: true,
      message: 'Check your inbox to confirm your email before signing in.',
    });
  }

  return NextResponse.json({
    id:       data.user!.id,
    username: data.user!.email ?? '',
    fullName,
    role:     'admin',
    canEdit:  true,
  });
}
