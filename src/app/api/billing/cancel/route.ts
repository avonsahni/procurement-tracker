import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { cancelSubscription } from '@/lib/razorpay';

export async function POST() {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();
  const { data: org } = await admin
    .from('organizations')
    .select('razorpay_subscription_id')
    .eq('id', auth.orgId)
    .single();

  if (!org?.razorpay_subscription_id) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
  }

  try {
    await cancelSubscription(org.razorpay_subscription_id);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Cancellation failed' }, { status: 500 });
  }

  // Mark as canceling — Razorpay will fire subscription.cancelled webhook when period ends
  const { error } = await admin
    .from('organizations')
    .update({ subscription_status: 'canceled' })
    .eq('id', auth.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
