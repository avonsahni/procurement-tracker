import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import { addOrgAuditEntry } from '@/lib/db';

export async function POST() {
  const supabase = await createServerSupabase();

  // Capture who is signing out before the session is torn down.
  const user = await getCurrentUser();
  if (user) {
    await addOrgAuditEntry(createAdminSupabase(), user.orgId, user.id, user.fullName,
      'Signed Out', 'auth', user.email);
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
