import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Double-submit absorber for POST create routes.
 *
 * Looks for an existing row in `table` matching all `match` fields, created
 * within the last `windowMs` (checked against `timeColumn`). Returns the full
 * existing row so the route can respond 201 with it instead of inserting a
 * duplicate. Pass `timeColumn: null` for tables without a timestamp column —
 * the match is then unconditional (use only where an exact duplicate is
 * meaningless, e.g. same vendor name twice in one package).
 */
export async function findRecentDuplicate(
  supabase: SupabaseClient,
  table: string,
  match: Record<string, unknown>,
  opts: { timeColumn?: string | null; windowMs?: number } = {},
): Promise<Record<string, any> | null> {
  const { timeColumn = 'created_at', windowMs = 10_000 } = opts;
  let q = supabase.from(table).select('*');
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v as never);
  if (timeColumn) q = q.gte(timeColumn, new Date(Date.now() - windowMs).toISOString());
  const { data } = await q.limit(1).maybeSingle();
  return (data as Record<string, any> | null) ?? null;
}
