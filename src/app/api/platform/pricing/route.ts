import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { withRoute } from '@/lib/withRoute';
import { z } from 'zod';

export const GET = withRoute(async () => {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;
  const admin = createAdminSupabase();
  const { data, error } = await admin.from('plan_pricing').select('*').order('tier');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}, { route: '/api/platform/pricing' });

const PricingUpdateSchema = z.object({
  tier:        z.enum(['trial','starter','pro','enterprise']),
  price_inr:   z.number().min(0),
  period:      z.string().max(50).optional(),
  description: z.string().max(300).optional(),
});

export const PUT = withRoute(async (req: NextRequest) => {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const result = PricingUpdateSchema.safeParse(raw);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0]?.message || 'Invalid' }, { status: 400 });
  const { tier, price_inr, period, description } = result.data;
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('plan_pricing')
    .update({ price_inr, period, description, updated_at: new Date().toISOString(), updated_by: auth.fullName })
    .eq('tier', tier)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}, { route: '/api/platform/pricing' });
