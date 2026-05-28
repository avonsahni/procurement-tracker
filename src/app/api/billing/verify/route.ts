import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyPaymentSignature, fetchSubscription } from '@/lib/razorpay';
import { z } from 'zod';

const Schema = z.object({
  razorpay_payment_id:      z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature:       z.string().min(1),
  plan:                     z.enum(['starter', 'pro']),
  period:                   z.enum(['monthly', 'annual']),
});

export async function POST(req: NextRequest) {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan, period } = parsed.data;

  const valid = await verifyPaymentSignature({
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
  });

  if (!valid) return NextResponse.json({ error: 'Payment signature invalid' }, { status: 400 });

  // Fetch subscription from Razorpay to get current period end
  let currentPeriodEnd: string | null = null;
  try {
    const sub = await fetchSubscription(razorpay_subscription_id);
    if (sub.current_end) {
      currentPeriodEnd = new Date(sub.current_end * 1000).toISOString();
    }
  } catch { /* non-fatal — we'll activate anyway */ }

  const admin = createAdminSupabase();
  const { error } = await admin
    .from('organizations')
    .update({
      plan,
      subscription_status:      'active',
      billing_period:           period,
      razorpay_subscription_id,
      trial_ends_at:            currentPeriodEnd,
      current_period_end:       currentPeriodEnd,
      paused_at:                null,
      paused_reason:            null,
    })
    .eq('id', auth.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, plan, period });
}
