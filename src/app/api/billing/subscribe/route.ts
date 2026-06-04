import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createSubscription, getPlanId } from '@/lib/razorpay';
import { z } from 'zod';

const SEAT_LIMITS: Record<string, { min: number; max: number }> = {
  starter: { min: 5,  max: 10 },
  pro:     { min: 10, max: 50 },
};

const Schema = z.object({
  plan:     z.enum(['starter', 'pro']),
  period:   z.enum(['monthly', 'annual']),
  quantity: z.number().int().min(1).default(1),
});

export async function POST(req: NextRequest) {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { plan, period, quantity } = parsed.data;
  const limits = SEAT_LIMITS[plan];
  if (quantity < limits.min) return NextResponse.json({ error: `Minimum ${limits.min} seats required for ${plan} plan` }, { status: 400 });
  if (quantity > limits.max) return NextResponse.json({ error: `Maximum ${limits.max} seats allowed for ${plan} plan` },  { status: 400 });

  try {
    const planId       = getPlanId(plan, period);
    const subscription = await createSubscription({
      planId,
      orgId:    auth.orgId,
      plan,
      period,
      quantity,
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create subscription' }, { status: 500 });
  }
}
