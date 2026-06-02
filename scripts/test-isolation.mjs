#!/usr/bin/env node
/**
 * Tenant-isolation test for procurement-tracker.
 *
 * Authenticates as two real test users via the ANON key and a signed-in
 * session. The service-role key is used ONLY for the diagnostic RLS report —
 * NEVER for any attack query, because the service role bypasses RLS and would
 * produce a false pass.
 *
 * For each tenant-scoped table the script runs four attacks in both directions
 * (A → B and B → A):
 *   SELECT  — expect zero rows returned
 *   UPDATE  — expect zero rows affected
 *   DELETE  — expect zero rows affected
 *   INSERT  — expect RLS error OR zero rows inserted
 *
 * Any non-empty result is a cross-tenant leak and exits with code 1.
 *
 * ── Required environment variables ──────────────────────────────────────────
 *   NEXT_PUBLIC_SUPABASE_URL    Supabase project URL
 *   SUPABASE_ANON_KEY           Anon/public key  (all attack queries use this)
 *   SUPABASE_SERVICE_ROLE_KEY   Service role key (diagnostic report ONLY)
 *   ISO_USER_A_EMAIL            Email for test Tenant-A user
 *   ISO_USER_A_PASSWORD         Password for test Tenant-A user
 *   ISO_USER_B_EMAIL            Email for test Tenant-B user
 *   ISO_USER_B_PASSWORD         Password for test Tenant-B user
 *
 * Run seed first:  npm run test:isolation:seed
 * Teardown after:  npm run test:isolation:teardown
 * ────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL  = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const ANON_KEY      = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const A_EMAIL       = process.env.ISO_USER_A_EMAIL;
const A_PASSWORD    = process.env.ISO_USER_A_PASSWORD;
const B_EMAIL       = process.env.ISO_USER_B_EMAIL;
const B_PASSWORD    = process.env.ISO_USER_B_PASSWORD;

// Fixed fixture UUIDs — must match isolation-seed.mjs
const FX = {
  orgA:     '10000000-0000-0000-0000-000000000001',
  orgB:     '20000000-0000-0000-0000-000000000002',
  projectA: '10000000-0000-0000-0000-000000000011',
  projectB: '20000000-0000-0000-0000-000000000022',
  packageA: '10000000-0000-0000-0000-000000000111',
  packageB: '20000000-0000-0000-0000-000000000222',
  vendorA:  '10000000-0000-0000-0000-000011111111',
  vendorB:  '20000000-0000-0000-0000-000022222222',
};

// ── Env validation ────────────────────────────────────────────────────────────
function requireEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'ISO_USER_A_EMAIL', 'ISO_USER_A_PASSWORD', 'ISO_USER_B_EMAIL', 'ISO_USER_B_PASSWORD',
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('✗ Missing required env vars:', missing.join(', '));
    console.error('  Copy .env.test.example → .env.test and fill in the values.');
    process.exit(1);
  }
}

// ── Table manifest ────────────────────────────────────────────────────────────
// Each entry describes how to target the `target` tenant's rows from the
// `attacker` tenant's session. `filter` is a function that receives a
// PostgREST query builder and adds the WHERE clause that selects
// the target's rows.
//
// `selectCols` defaults to 'id' (used in SELECT and to count affected rows in
// UPDATE/DELETE). Override for tables whose PK is not 'id' (e.g. company_info).
function buildManifest(target, attacker) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  return [
    // ── Direct org_id tables ──────────────────────────────────────────────
    {
      table:         'projects',
      filter:        q => q.eq('org_id', target.orgId),
      updatePayload: { name: '__iso_probe' },
      insertPayload: { org_id: target.orgId, owner_id: attacker.userId, name: '__iso_probe', budget: 0 },
    },
    {
      table:         'categories',
      filter:        q => q.eq('org_id', target.orgId),
      updatePayload: { name: '__iso_probe' },
      insertPayload: { org_id: target.orgId, user_id: attacker.userId, name: '__iso_probe' },
    },
    {
      table:         'company_info',
      selectCols:    'user_id',   // PK is user_id, not id
      filter:        q => q.eq('org_id', target.orgId),
      updatePayload: { name: '__iso_probe' },
      // Insert with attacker's user_id but target's org_id.
      // is_org_admin(org_id) WITH CHECK blocks it before any PK/unique check.
      insertPayload: { user_id: attacker.userId, org_id: target.orgId, name: '__iso_probe' },
    },
    {
      table:         'organization_members',
      filter:        q => q.eq('org_id', target.orgId),
      updatePayload: { role: 'viewer' },
      // Attacker tries to add themselves to the target org.
      // is_org_admin(org_id) WITH CHECK blocks this.
      insertPayload: { org_id: target.orgId, user_id: attacker.userId, role: 'viewer' },
    },
    {
      table:         'org_audit_log',
      filter:        q => q.eq('org_id', target.orgId),
      updatePayload: { action: '__iso_probe' },
      // org_audit_log has no INSERT policy at all — default-deny blocks this.
      insertPayload: { org_id: target.orgId, user_id: attacker.userId, user_name: 'attacker', action: '__iso_probe', category: 'test' },
    },
    // ── FK-chain tables (access controlled via package → project → org) ───
    {
      table:         'packages',
      filter:        q => q.eq('project_id', target.projectId),
      updatePayload: { name: '__iso_probe' },
      insertPayload: { project_id: target.projectId, name: '__iso_probe', currency: 'USD', current_stage: 'Spec Received' },
    },
    {
      table:         'vendors',
      filter:        q => q.eq('package_id', target.packageId),
      updatePayload: { name: '__iso_probe' },
      insertPayload: { package_id: target.packageId, name: '__iso_probe', quoted_amount: 0, revised_amount: 0 },
    },
    {
      table:         'vendor_revisions',
      filter:        q => q.eq('package_id', target.packageId),
      updatePayload: { notes: '__iso_probe' },
      // Uses target's vendorId so FK is valid — RLS WITH CHECK (implicit from
      // FOR ALL USING) must be the blocker, not the FK constraint.
      insertPayload: { package_id: target.packageId, vendor_id: target.vendorId, round_number: 999, amount: 0, notes: '', created_by: 'attacker' },
    },
    {
      table:         'remarks',
      filter:        q => q.eq('package_id', target.packageId),
      updatePayload: { text: '__iso_probe' },
      insertPayload: { package_id: target.packageId, username: 'attacker', text: '__iso_probe' },
    },
    {
      table:         'documents',
      filter:        q => q.eq('package_id', target.packageId),
      updatePayload: { name: '__iso_probe' },
      insertPayload: { package_id: target.packageId, name: '__iso_probe', size: '0', type: 'text/plain', username: 'attacker' },
    },
    {
      table:         'invoices',
      filter:        q => q.eq('package_id', target.packageId),
      updatePayload: { invoice_number: '__iso_probe' },
      insertPayload: { package_id: target.packageId, amount: 0, invoice_number: '__iso_probe', invoice_date: new Date().toISOString(), username: 'attacker' },
    },
    {
      table:         'audit_trail',
      filter:        q => q.eq('package_id', target.packageId),
      updatePayload: { new_value: '__iso_probe' },
      insertPayload: { package_id: target.packageId, username: 'attacker', field: '__iso_probe', old_value: '', new_value: '' },
    },
    {
      table:         'package_milestones',
      filter:        q => q.eq('package_id', target.packageId),
      updatePayload: { milestone_name: '__iso_probe' },
      insertPayload: { package_id: target.packageId, milestone_name: '__iso_probe', display_order: 999, progress: 0 },
    },
    {
      table:         'milestone_tasks',
      filter:        q => q.eq('package_id', target.packageId),
      updatePayload: { name: '__iso_probe' },
      // Also carries org_id — both the package chain AND the org_id must agree.
      insertPayload: { package_id: target.packageId, org_id: target.orgId, milestone_name: '__iso_probe', name: '__iso_probe', progress: 0, sort_order: 999, created_by: 'attacker' },
    },
    {
      table:         'cash_inflow',
      filter:        q => q.eq('package_id', target.packageId),
      updatePayload: { remarks: '__iso_probe' },
      insertPayload: { package_id: target.packageId, on_account: '__iso_probe', amount: 0, date_received: today, created_by: 'attacker' },
    },
    {
      table:         'cash_outflow',
      filter:        q => q.eq('package_id', target.packageId),
      updatePayload: { remarks: '__iso_probe' },
      insertPayload: { package_id: target.packageId, to_whom: '__iso_probe', amount: 0, date_paid: today, created_by: 'attacker' },
    },
    // ── User profile table ────────────────────────────────────────────────
    {
      table:         'profiles',
      filter:        q => q.eq('id', target.userId),
      updatePayload: { full_name: '__iso_probe' },
      // profiles_self WITH CHECK (id = auth.uid()) blocks inserting for another user.
      insertPayload: { id: target.userId, full_name: '__iso_probe' },
    },
  ];
}

// ── Run four attacks on one table entry ───────────────────────────────────────
async function attackTable(client, entry) {
  const sel = entry.selectCols || 'id';
  const ops = [];

  // SELECT — RLS USING hides rows; expect empty array, no error.
  const { data: selData, error: selErr } = await entry.filter(
    client.from(entry.table).select(sel)
  );
  ops.push({
    op:     'SELECT',
    passed: !selErr && (selData?.length ?? 0) === 0,
    detail: selErr ? selErr.message : `${selData?.length ?? '?'} rows`,
  });

  // UPDATE — RLS USING filters out rows; expect empty array, no error.
  const { data: updData, error: updErr } = await entry.filter(
    client.from(entry.table).update(entry.updatePayload)
  ).select(sel);
  ops.push({
    op:     'UPDATE',
    passed: !updErr && (updData?.length ?? 0) === 0,
    detail: updErr ? updErr.message : `${updData?.length ?? '?'} rows`,
  });

  // DELETE — same as UPDATE.
  const { data: delData, error: delErr } = await entry.filter(
    client.from(entry.table).delete()
  ).select(sel);
  ops.push({
    op:     'DELETE',
    passed: !delErr && (delData?.length ?? 0) === 0,
    detail: delErr ? delErr.message : `${delData?.length ?? '?'} rows`,
  });

  // INSERT — RLS WITH CHECK raises code 42501 OR returns no rows if silently
  // blocked. Either outcome is a pass; a row in `data` is a leak.
  const { data: insData, error: insErr } = await client
    .from(entry.table)
    .insert(entry.insertPayload)
    .select(sel);
  ops.push({
    op:     'INSERT',
    passed: insErr !== null || (insData?.length ?? 0) === 0,
    detail: insErr ? insErr.message : `${insData?.length ?? '?'} rows`,
  });

  return ops;
}

// ── Run all attacks in one direction ──────────────────────────────────────────
async function runDirection(client, fromLabel, toLabel, target, attacker) {
  const manifest = buildManifest(target, attacker);
  const results  = [];

  for (const entry of manifest) {
    const ops     = await attackTable(client, entry);
    const allPass = ops.every(o => o.passed);
    results.push({ table: entry.table, ops, allPass });

    if (allPass) {
      console.log(`  ✅  ${entry.table.padEnd(28)} ${fromLabel} → ${toLabel}`);
    } else {
      const leaked = ops
        .filter(o => !o.passed)
        .map(o => `${o.op}(${o.detail})`)
        .join(', ');
      console.log(`  ❌  ${entry.table.padEnd(28)} ${fromLabel} → ${toLabel}   LEAK [${leaked}]`);
    }
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  requireEnv();

  console.log('\n══════════════════════════════════════════════════════');
  console.log(' Tenant Isolation Test — procurement-tracker');
  console.log('══════════════════════════════════════════════════════\n');

  const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // ── Diagnostic: RLS coverage ─────────────────────────────────────────────
  console.log('── Diagnostic: RLS coverage ────────────────────────────');
  const { data: rlsRows, error: rlsErr } = await serviceClient.rpc('_iso_rls_status');

  if (rlsErr) {
    console.warn(`  ⚠  _iso_rls_status() failed: ${rlsErr.message}`);
    console.warn('     Apply migration 033 then re-run.\n');
  } else {
    const noRls    = (rlsRows || []).filter(r => !r.rls_enabled);
    const noPol    = (rlsRows || []).filter(r => r.rls_enabled && Number(r.policy_count) === 0);
    const implicit = (rlsRows || []).filter(r => r.implicit_insert_check);

    for (const r of noRls) {
      console.log(`  ⚠  ${r.table_name}: RLS NOT ENABLED`);
    }
    for (const r of noPol) {
      console.log(`  ⚠  ${r.table_name}: RLS enabled but zero policies attached (default-deny)`);
    }
    for (const r of implicit) {
      console.log(`  ℹ  ${r.table_name}: FOR ALL policy — no explicit WITH CHECK (USING acts as check; correct but implicit)`);
    }
    if (!noRls.length && !noPol.length) {
      console.log('  ✓  All public tables have RLS enabled with at least one policy.');
    }
  }
  console.log();

  // ── Authentication ───────────────────────────────────────────────────────
  console.log('── Authentication ──────────────────────────────────────');

  const clientA = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const clientB = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
    email: A_EMAIL, password: A_PASSWORD,
  });
  if (errA) {
    console.error(`  ✗ Cannot sign in as User A (${A_EMAIL}): ${errA.message}`);
    console.error('    Run: npm run test:isolation:seed');
    process.exit(1);
  }
  console.log(`  ✓ Tenant A: ${A_EMAIL}  (${authA.user.id})`);

  const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
    email: B_EMAIL, password: B_PASSWORD,
  });
  if (errB) {
    console.error(`  ✗ Cannot sign in as User B (${B_EMAIL}): ${errB.message}`);
    console.error('    Run: npm run test:isolation:seed');
    process.exit(1);
  }
  console.log(`  ✓ Tenant B: ${B_EMAIL}  (${authB.user.id})`);
  console.log();

  const idsA = { orgId: FX.orgA, projectId: FX.projectA, packageId: FX.packageA, vendorId: FX.vendorA, userId: authA.user.id };
  const idsB = { orgId: FX.orgB, projectId: FX.projectB, packageId: FX.packageB, vendorId: FX.vendorB, userId: authB.user.id };

  // ── Attacks: A → B ───────────────────────────────────────────────────────
  console.log('── Attack: Tenant A trying to access Tenant B data ─────');
  const resultsAB = await runDirection(clientA, 'A', 'B', idsB, idsA);
  console.log();

  // ── Attacks: B → A ───────────────────────────────────────────────────────
  console.log('── Attack: Tenant B trying to access Tenant A data ─────');
  const resultsBA = await runDirection(clientB, 'B', 'A', idsA, idsB);
  console.log();

  // ── Summary ──────────────────────────────────────────────────────────────
  const all      = [...resultsAB, ...resultsBA];
  const failures = all.filter(r => !r.allPass);
  const tables   = new Set(all.map(r => r.table)).size;

  console.log('── Summary ─────────────────────────────────────────────');
  console.log(`   Tables tested : ${tables}`);
  console.log(`   Directions    : 2  (A→B, B→A)`);
  console.log(`   Operations    : SELECT / UPDATE / DELETE / INSERT per table`);
  console.log(`   Total checks  : ${all.length * 4}`);
  console.log();

  if (failures.length === 0) {
    console.log('   ✅  ALL ISOLATION CHECKS PASSED\n');
    process.exit(0);
  } else {
    console.log(`   ❌  ${failures.length} TABLE(S) LEAKED DATA:\n`);
    for (const f of failures) {
      const leakedOps = f.ops.filter(o => !o.passed);
      console.log(`   Table: ${f.table}`);
      for (const op of leakedOps) {
        console.log(`     ${op.op.padEnd(8)} — ${op.detail}`);
      }
    }
    console.log();
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
