import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/razorpay';

// Razorpay webhooks must be received as raw body for signature verification.
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const rawBody  = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

  let event: { event: string; payload?: any };
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const sub = event.payload?.subscription?.entity;
  if (!sub) return NextResponse.json({ ok: true }); // unknown event shape — ack and ignore

  const orgId: string | undefined = sub.notes?.org_id;
  if (!orgId) return NextResponse.json({ ok: true });

  const admin = createAdminSupabase();

  switch (event.event) {
    case 'subscription.activated': {
      const periodEnd = sub.current_end
        ? new Date(sub.current_end * 1000).toISOString()
        : null;
      await admin.from('organizations').update({
        subscription_status:      'active',
        plan:                     sub.notes?.plan ?? undefined,
        billing_period:           sub.notes?.period ?? undefined,
        razorpay_subscription_id: sub.id,
        current_period_end:       periodEnd,
        trial_ends_at:            periodEnd,
        paused_at:                null,
        paused_reason:            null,
      }).eq('id', orgId);
      break;
    }

    case 'subscription.charged': {
      // Renewal — extend period end
      const periodEnd = sub.current_end
        ? new Date(sub.current_end * 1000).toISOString()
        : null;
      await admin.from('organizations').update({
        subscription_status: 'active',
        current_period_end:  periodEnd,
        trial_ends_at:       periodEnd,
        paused_at:           null,
        paused_reason:       null,
      }).eq('id', orgId);
      break;
    }

    case 'subscription.halted': {
      // Payment failed — grace period, mark paused
      await admin.from('organizations').update({
        subscription_status: 'paused',
        paused_at:           new Date().toISOString(),
        paused_reason:       'Payment failed — please update your payment method',
      }).eq('id', orgId);
      break;
    }

    case 'subscription.cancelled':
    case 'subscription.completed': {
      await admin.from('organizations').update({
        subscription_status:      'canceled',
        razorpay_subscription_id: null,
        billing_period:           null,
      }).eq('id', orgId);
      break;
    }

    case 'subscription.pending':
    case 'subscription.resumed': {
      await admin.from('organizations').update({
        subscription_status: 'active',
        paused_at:           null,
        paused_reason:       null,
      }).eq('id', orgId);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
