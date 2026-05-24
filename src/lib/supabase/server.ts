import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function requireEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required. ' +
      'Copy them from Supabase Dashboard → Project Settings → API into .env.local (and Vercel env vars).'
    );
  }
  return { url, key };
}

export async function createServerSupabase() {
  const { url, key } = requireEnv();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll can fail in server components — safe to ignore, middleware would set
        }
      },
    },
  });
}
