import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// In Next.js 16 the edge middleware file is proxy.ts (renamed from middleware.ts).
// This file does three things:
//   1. CSRF protection on all state-changing API routes.
//   2. Refreshes the Supabase auth session cookie on every request (required by @supabase/ssr).
//   3. Injects security headers on every response.
export async function proxy(request: NextRequest) {
  // ── CSRF protection ───────────────────────────────────────────────────────
  // Reject mutating requests to /api/ whose Origin header is present but
  // doesn't match this host. Absent Origin (server-to-server, curl) is
  // allowed so the API stays usable from non-browser clients.
  const method = request.method;
  const isApiMutation =
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
    request.nextUrl.pathname.startsWith('/api/');

  if (isApiMutation) {
    const origin = request.headers.get('origin');
    if (origin) {
      const expectedOrigin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
      if (origin !== expectedOrigin) {
        return NextResponse.json(
          { error: 'CSRF validation failed' },
          { status: 403 }
        );
      }
    }
  }

  const response = NextResponse.next({ request });

  // ── Supabase session refresh ──────────────────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });
    await supabase.auth.getUser();
  }

  // ── Security headers ──────────────────────────────────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} wss://*.supabase.co`,
      "frame-ancestors 'none'",
    ].join('; ')
  );

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
