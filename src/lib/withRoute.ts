/**
 * Route handler wrapper for Next.js App Router.
 *
 * Catches any unhandled exception thrown by the handler, logs it to the
 * error_log Supabase table via logError(), and returns a generic 500 so
 * stack traces never leak to the client.
 *
 * Usage:
 *   export const GET = withRoute(async (req) => { ... });
 *   export const POST = withRoute(async (req, ctx) => { ... }, { route: '/api/packages' });
 */
import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/errorLog';

// Matches both plain handlers and handlers with route params
type RouteCtx = { params: Promise<Record<string, string>> };
type Handler = (req: NextRequest, ctx?: RouteCtx) => Promise<Response | NextResponse>;

export function withRoute(handler: Handler, meta?: { route?: string }): Handler {
  return async (req: NextRequest, ctx?: RouteCtx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      const route = meta?.route ?? req.nextUrl.pathname;
      console.error(`[${req.method} ${route}] unhandled exception:`, err);
      // Fire-and-forget — don't await so the 500 returns immediately
      logError(err, {
        source: 'api',
        route,
        context: { method: req.method },
      }).catch(() => {});
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
