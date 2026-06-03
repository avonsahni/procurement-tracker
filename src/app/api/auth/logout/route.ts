import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { clearSession, clearSessionCookie } from '@/lib/session';

export async function POST() {
  const supabase = await createServerSupabase();

  // Free the single-session slot so the user can log in again immediately.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await clearSession(createAdminSupabase(), user.id);
  }
  clearSessionCookie(await cookies());

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
