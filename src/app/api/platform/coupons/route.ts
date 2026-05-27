import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { withRoute } from '@/lib/withRoute';
import { z } from 'zod';

export const GET = withRoute(async () => {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;
  const admin = createAdminSupabase();
  const { data, error } = await admin.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}, { route: '/api/platform/coupons' });

const CouponCreateSchema = z.object({
  code:         z.string().trim().min(3).max(50).toUpperCase(),
  type:         z.enum(['free','discount']),
  discount_pct: z.number().int().min(1).max(100).optional(),
  free_plan:    z.enum(['starter','pro','enterprise']).optional(),
  valid_days:   z.number().int().min(1).max(3650),
  max_uses:     z.number().int().min(1).optional().nullable(),
  expires_at:   z.string().datetime().optional().nullable(),
  notes:        z.string().max(500).optional(),
}).refine(d => {
  if (d.type === 'discount') return typeof d.discount_pct === 'number';
  if (d.type === 'free')     return typeof d.free_plan === 'string';
  return false;
}, { message: 'discount_pct required for discount coupons; free_plan required for free coupons' });

export const POST = withRoute(async (req: NextRequest) => {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const result = CouponCreateSchema.safeParse(raw);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0]?.message || 'Invalid' }, { status: 400 });
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('coupons')
    .insert({ ...result.data, created_by: auth.fullName })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: `Coupon code "${result.data.code}" already exists.` }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}, { route: '/api/platform/coupons' });
