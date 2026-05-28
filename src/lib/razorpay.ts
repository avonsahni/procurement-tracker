// Razorpay server-side helpers using native fetch (no SDK required).

const BASE = 'https://api.razorpay.com/v1';

function authHeader() {
  const key    = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) throw new Error('Razorpay keys not configured');
  return 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
}

async function rzpFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.description || `Razorpay error ${res.status}`);
  return body;
}

export function getPlanId(plan: 'starter' | 'pro', period: 'monthly' | 'annual'): string {
  const map: Record<string, string | undefined> = {
    starter_monthly: process.env.RAZORPAY_PLAN_STARTER_MONTHLY,
    starter_annual:  process.env.RAZORPAY_PLAN_STARTER_ANNUAL,
    pro_monthly:     process.env.RAZORPAY_PLAN_PRO_MONTHLY,
    pro_annual:      process.env.RAZORPAY_PLAN_PRO_ANNUAL,
  };
  const id = map[`${plan}_${period}`];
  if (!id) throw new Error(`Razorpay plan ID not configured for ${plan}/${period}`);
  return id;
}

export async function createSubscription(params: {
  planId:  string;
  orgId:   string;
  plan:    string;
  period:  string;
  userEmail?: string;
  userName?:  string;
}) {
  return rzpFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id:        params.planId,
      total_count:    params.period === 'annual' ? 10 : 120, // ~10 years worth
      quantity:       1,
      customer_notify: 1,
      notes: {
        org_id: params.orgId,
        plan:   params.plan,
        period: params.period,
      },
    }),
  });
}

export async function cancelSubscription(subscriptionId: string) {
  return rzpFetch(`/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancel_at_cycle_end: 1 }),
  });
}

export async function fetchSubscription(subscriptionId: string) {
  return rzpFetch(`/subscriptions/${subscriptionId}`);
}

// Verify payment signature after Razorpay checkout completes.
// signature = HMAC-SHA256(payment_id + "|" + subscription_id, key_secret)
export async function verifyPaymentSignature(params: {
  razorpay_payment_id:      string;
  razorpay_subscription_id: string;
  razorpay_signature:       string;
}): Promise<boolean> {
  const crypto = await import('crypto');
  const secret = process.env.RAZORPAY_KEY_SECRET ?? '';
  const body   = `${params.razorpay_payment_id}|${params.razorpay_subscription_id}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expected === params.razorpay_signature;
}

// Verify webhook signature.
// signature = HMAC-SHA256(raw_body_string, webhook_secret)
export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const crypto = await import('crypto');
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}
