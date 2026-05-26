import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { guard } from '@/lib/auth';

// Wipes the current user's workspace (projects + cascading packages/vendors/remarks/documents/audit).
// Categories and company_info are preserved.
export async function POST() {
  const auth = await guard('admin');
  if (auth instanceof NextResponse) return auth;
  const supabase = await createServerSupabase();
  await supabase.from('projects').delete().eq('owner_id', auth.id);
  return NextResponse.json({ ok: true });
}
