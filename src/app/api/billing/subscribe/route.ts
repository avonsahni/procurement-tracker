import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createSubscription, getPlanId } from '@/lib/razorpay';
import { z } from 'zod';

const Schema = z.object({
  plan:   z.enum(['starter', 'pro']),
  period: z.enum(['monthly', 'annual']),
});

export async function POST(req: NextRequest) {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { plan, period } = parsed.data;

  try {
    const planId       = getPlanId(plan, period);
    const subscription = await createSubscription({
      planId,
      orgId:  auth.orgId,
      plan,
      period,
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create subscription' }, { status: 500 });
  }
}
