import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { logError } from '@/lib/errorLog';

/**
 * POST /api/errors
 * Accepts client-side error reports (from error.tsx / global-error.tsx boundaries).
 * Authenticated users only — anonymous reports are discarded to prevent abuse.
 *
 * Body: { message, stack?, route?, context? }
 */
export async function POST(req: NextRequest) {
  // Must be authenticated — no unauthenticated error ingestion
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: { message?: string; stack?: string; route?: string; context?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.slice(0, 2000) : 'Client error';
  const stack   = typeof body.stack   === 'string' ? body.stack.slice(0, 5000)   : undefined;
  const route   = typeof body.route   === 'string' ? body.route.slice(0, 500)    : undefined;

  await logError(
    { message, stack },
    {
      source:  'client',
      route,
      context: body.context ?? undefined,
      userId:  user.id,
      orgId:   user.orgId || null,
    }
  );

  return NextResponse.json({ ok: true });
}
