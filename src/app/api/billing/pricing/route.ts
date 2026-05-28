import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

// Public pricing for the upgrade modal — auth required, no plan restriction.
export async function GET() {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('plan_pricing')
    .select('tier, price_inr, price_inr_annual, period, description')
    .in('tier', ['starter', 'pro'])
    .order('tier');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
