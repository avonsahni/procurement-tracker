import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('organizations')
    .select('plan, subscription_status, billing_period, trial_ends_at, current_period_end, razorpay_subscription_id')
    .eq('id', auth.orgId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    plan:               data.plan,
    status:             data.subscription_status,
    billingPeriod:      data.billing_period,
    trialEndsAt:        data.trial_ends_at,
    currentPeriodEnd:   data.current_period_end,
    hasSubscription:    !!data.razorpay_subscription_id,
  });
}
