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
    couponCode, seedData,
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

    // Only seed when the user explicitly opted in
    if (seedData && membership?.org_id) {
      await seedSampleData(admin, data.user.id, membership.org_id);
    }

    // Apply coupon if provided
    if (couponCode && membership?.org_id) {
      const { data: coupon } = await admin
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (coupon &&
        (coupon.max_uses === null || coupon.used_count < coupon.max_uses) &&
        (!coupon.expires_at || new Date(coupon.expires_at) >= new Date())
      ) {
        const orgUpdates: Record<string, unknown> = { coupon_code: coupon.code };

        if (coupon.type === 'free' && coupon.free_plan) {
          // Grant a full paid plan for valid_days days at no charge
          orgUpdates.plan = coupon.free_plan;
          orgUpdates.subscription_status = 'active';
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + coupon.valid_days);
          orgUpdates.trial_ends_at = expiresAt.toISOString();
        } else if (coupon.type === 'discount') {
          // Extend the trial period by valid_days (discount on subscription applies at billing)
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + coupon.valid_days);
          orgUpdates.trial_ends_at = expiresAt.toISOString();
        }

        await admin.from('organizations').update(orgUpdates).eq('id', membership.org_id);
        await admin.from('coupons').update({ used_count: (coupon.used_count ?? 0) + 1 }).eq('id', coupon.id);
      }
    }
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
