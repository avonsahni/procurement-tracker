import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * POST /api/push/subscribe
 * Body: a PushSubscription JSON { endpoint, keys: { p256dh, auth } }
 *
 * Upserts the subscription against the current user. The endpoint is unique,
 * so re-subscribing from the same device updates the existing row rather than
 * creating duplicates.
 */
export async function POST(req: NextRequest) {
  const auth = await guard("user");
  if (auth instanceof NextResponse) return auth;

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const authKey = body.keys?.auth;

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json(
      { error: "endpoint and keys (p256dh, auth) are required" },
      { status: 400 }
    );
  }

  const admin = createAdminSupabase();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: auth.id,
      org_id: auth.orgId || null,
      endpoint,
      p256dh,
      auth: authKey,
      user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push/subscribe]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
