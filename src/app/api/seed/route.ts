import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';
import { seedSampleData } from '@/lib/seed-data';

export async function POST() {
  const auth = await guard('editor');
  if (auth instanceof NextResponse) return auth;
  const supabase = await createServerSupabase();
  const result = await seedSampleData(supabase, auth.id);
  return NextResponse.json({ ok: true, ...result });
}
