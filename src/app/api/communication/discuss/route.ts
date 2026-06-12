import { NextResponse } from "next/server";
import { guard } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * POST /api/communication/discuss
 * Body: { entity_type: "package"|"milestone"|"budget_line", entity_id: uuid, project_id?: uuid }
 *
 * Calls get_or_create_entity_channel() which is SECURITY DEFINER (safe to call
 * via admin client) and returns the channel UUID. The caller redirects to
 * /communication/<channelId>.
 */
export async function POST(req: Request) {
  const user = await guard("user");
  if (user instanceof NextResponse) return user;

  let body: { entity_type?: string; entity_id?: string; project_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { entity_type, entity_id, project_id } = body;
  if (!entity_type || !entity_id) {
    return NextResponse.json(
      { error: "entity_type and entity_id are required" },
      { status: 400 }
    );
  }

  const admin = createAdminSupabase();
  const { data: channelId, error } = await admin.rpc(
    "get_or_create_entity_channel",
    {
      p_org_id: user.orgId,
      p_entity_type: entity_type,
      p_entity_id: entity_id,
      p_creator_id: user.id,
    }
  );

  if (error || !channelId) {
    console.error("[discuss]", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Failed to get channel" },
      { status: 500 }
    );
  }

  // If a project_id is supplied, back-fill it on the channel (entity channels
  // created via get_or_create_entity_channel don't set project_id by default).
  if (project_id) {
    await admin
      .from("channels")
      .update({ project_id })
      .eq("id", channelId)
      .is("project_id", null); // only patch when not already set
  }

  return NextResponse.json({ channelId });
}
