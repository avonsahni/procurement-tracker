import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { withRoute } from '@/lib/withRoute';

export const PATCH = withRoute(async (req: NextRequest, ctx) => {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;
  const { code } = await ctx!.params as { code: string };
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('coupons')
    .update(raw as object)
    .eq('code', code.toUpperCase())
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
  return NextResponse.json(data);
}, { route: '/api/platform/coupons/[code]' });

export const DELETE = withRoute(async (_req: NextRequest, ctx) => {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;
  const { code } = await ctx!.params as { code: string };
  const admin = createAdminSupabase();
  const { error } = await admin.from('coupons').delete().eq('code', code.toUpperCase());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}, { route: '/api/platform/coupons/[code]' });
