import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'code param required' }, { status: 400 });

  const admin = createAdminSupabase();
  const { data: coupon, error } = await admin
    .from('coupons')
    .select('code,type,discount_pct,free_plan,valid_days,max_uses,used_count,is_active,expires_at,notes')
    .eq('code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!coupon) return NextResponse.json({ valid: false, error: 'Coupon code not found.' }, { status: 404 });
  if (!coupon.is_active) return NextResponse.json({ valid: false, error: 'This coupon is no longer active.' }, { status: 410 });
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
    return NextResponse.json({ valid: false, error: 'This coupon has expired.' }, { status: 410 });
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses)
    return NextResponse.json({ valid: false, error: 'This coupon has reached its usage limit.' }, { status: 410 });

  // Build human-readable benefit string
  let benefit = '';
  if (coupon.type === 'free') {
    const planLabel = coupon.free_plan ? coupon.free_plan.charAt(0).toUpperCase() + coupon.free_plan.slice(1) : 'Paid';
    benefit = `${planLabel} plan free for ${coupon.valid_days} days`;
  } else {
    benefit = `${coupon.discount_pct}% discount for ${coupon.valid_days} days`;
  }

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    discount_pct: coupon.discount_pct,
    free_plan: coupon.free_plan,
    valid_days: coupon.valid_days,
    benefit,
  });
}
