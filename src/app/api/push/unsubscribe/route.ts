import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * POST /api/push/unsubscribe
 * Body: { endpoint: string }
 *
 * Removes a single device's push subscription. Scoped to the current user so
 * one user cannot delete another's subscription.
 */
export async function POST(req: NextRequest) {
  const auth = await guard("user");
  if (auth instanceof NextResponse) return auth;

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint)
    .eq("user_id", auth.id);

  if (error) {
    console.error("[push/unsubscribe]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
