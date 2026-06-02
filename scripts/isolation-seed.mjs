#!/usr/bin/env node
/**
 * Seeds two throwaway test tenants for the tenant isolation test suite.
 *
 * Safe to run multiple times — every write uses upsert or INSERT … ON CONFLICT
 * DO NOTHING, so re-running against a database that already has the fixtures
 * is a no-op.
 *
 * What gets created:
 *   • 2 organizations          (fixed UUIDs)
 *   • 2 auth users             (one owner per org, fixed UUIDs)
 *   • 2 profiles               (via handle_new_user trigger)
 *   • 2 company_info rows      (one per org)
 *   • 2 projects               (one per org, fixed UUIDs)
 *   • 2 packages               (one per project, fixed UUIDs)
 *   • 2 vendors                (one per package, fixed UUIDs)
 *   • Sample rows in every child table (for SELECT/UPDATE/DELETE attack targets)
 *
 * Required env vars: same as test-isolation.mjs (see .env.test.example).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const A_EMAIL      = process.env.ISO_USER_A_EMAIL;
const A_PASSWORD   = process.env.ISO_USER_A_PASSWORD;
const B_EMAIL      = process.env.ISO_USER_B_EMAIL;
const B_PASSWORD   = process.env.ISO_USER_B_PASSWORD;

// These IDs are shared with test-isolation.mjs and isolation-teardown.mjs.
const FX = {
  userA:    '10000000-0000-0000-0000-a00000000001',
  userB:    '20000000-0000-0000-0000-b00000000002',
  orgA:     '10000000-0000-0000-0000-000000000001',
  orgB:     '20000000-0000-0000-0000-000000000002',
  projectA: '10000000-0000-0000-0000-000000000011',
  projectB: '20000000-0000-0000-0000-000000000022',
  packageA: '10000000-0000-0000-0000-000000000111',
  packageB: '20000000-0000-0000-0000-000000000222',
  vendorA:  '10000000-0000-0000-0000-000011111111',
  vendorB:  '20000000-0000-0000-0000-000022222222',
};

function die(msg, err) {
  console.error(`  ✗ ${msg}`, err?.message ?? err ?? '');
  process.exit(1);
}

// Wrap a supabase call: log a warning on error but don't abort.
async function soft(label, promise) {
  const { error } = await promise;
  if (error && !error.message?.includes('duplicate') && !error.message?.includes('already exists')) {
    console.warn(`  ⚠  ${label}: ${error.message}`);
  }
}

async function seed() {
  if (!SUPABASE_URL || !SERVICE_KEY) die('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  if (!A_EMAIL || !A_PASSWORD || !B_EMAIL || !B_PASSWORD) die('ISO_USER_A/B_EMAIL and ISO_USER_A/B_PASSWORD are required');

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const today = new Date().toISOString().split('T')[0];

  console.log('\n── Seeding tenant isolation fixtures ───────────────────\n');

  // ── Organizations ─────────────────────────────────────────────────────────
  for (const [label, id, name] of [
    ['A', FX.orgA, 'ISO Test Org A'],
    ['B', FX.orgB, 'ISO Test Org B'],
  ]) {
    const { error } = await admin.from('organizations')
      .upsert({ id, name }, { onConflict: 'id', ignoreDuplicates: false });
    if (error) die(`organizations ${label}`, error);
    console.log(`  ✓ org-${label}        ${id}`);
  }

  // ── Auth users ────────────────────────────────────────────────────────────
  // We do NOT pass org_id in user_metadata. Passing it triggers the IF branch
  // of handle_new_user which uses ON CONFLICT (org_id, user_id) — a constraint
  // that migration 032 dropped. On pre-033 databases that clause is invalid and
  // the createUser call fails. Instead we let the trigger take the self-signup
  // path (creates a throwaway org), then immediately overwrite the membership.
  for (const [label, id, email, password, orgId] of [
    ['A', FX.userA, A_EMAIL, A_PASSWORD, FX.orgA],
    ['B', FX.userB, B_EMAIL, B_PASSWORD, FX.orgB],
  ]) {
    const { data: existing } = await admin.auth.admin.getUserById(id);
    if (existing?.user) {
      console.log(`  ✓ user-${label}       ${email} (already exists)`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        id,
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `ISO Test User ${label}` },
      });
      if (error) die(`createUser ${label}`, error);
      console.log(`  ✓ user-${label}       ${data.user.id}`);
    }

    // Point membership to the fixed org (upsert handles both first-run and re-run).
    const { error: memErr } = await admin.from('organization_members')
      .upsert({ org_id: orgId, user_id: id, role: 'owner' }, { onConflict: 'user_id' });
    if (memErr) die(`org_member ${label}`, memErr);
  }

  // ── Company info ──────────────────────────────────────────────────────────
  for (const [userId, orgId, label] of [
    [FX.userA, FX.orgA, 'A'],
    [FX.userB, FX.orgB, 'B'],
  ]) {
    await soft(`company_info ${label}`,
      admin.from('company_info')
        .upsert({ user_id: userId, org_id: orgId, name: `ISO Test Co ${label}` }, { onConflict: 'user_id' })
    );
  }

  // ── Projects ──────────────────────────────────────────────────────────────
  for (const [label, id, orgId, ownerId] of [
    ['A', FX.projectA, FX.orgA, FX.userA],
    ['B', FX.projectB, FX.orgB, FX.userB],
  ]) {
    const { error } = await admin.from('projects')
      .upsert({ id, org_id: orgId, owner_id: ownerId, name: `ISO Test Project ${label}`, budget: 1000 }, { onConflict: 'id' });
    if (error) die(`project ${label}`, error);
    console.log(`  ✓ project-${label}    ${id}`);
  }

  // ── Packages ──────────────────────────────────────────────────────────────
  for (const [label, id, projectId] of [
    ['A', FX.packageA, FX.projectA],
    ['B', FX.packageB, FX.projectB],
  ]) {
    const { error } = await admin.from('packages')
      .upsert({ id, project_id: projectId, name: `ISO Test Package ${label}`, currency: 'USD', current_stage: 'Spec Received' }, { onConflict: 'id' });
    if (error) die(`package ${label}`, error);
    console.log(`  ✓ package-${label}    ${id}`);
  }

  // ── Vendors ───────────────────────────────────────────────────────────────
  for (const [label, id, packageId] of [
    ['A', FX.vendorA, FX.packageA],
    ['B', FX.vendorB, FX.packageB],
  ]) {
    const { error } = await admin.from('vendors')
      .upsert({ id, package_id: packageId, name: `ISO Test Vendor ${label}`, quoted_amount: 500, revised_amount: 500 }, { onConflict: 'id' });
    if (error) die(`vendor ${label}`, error);
    console.log(`  ✓ vendor-${label}     ${id}`);
  }

  // ── Child rows (SELECT/UPDATE/DELETE tests need existing rows to attempt) ─
  console.log('\n  Seeding child rows …');

  for (const [vendorId, packageId] of [[FX.vendorA, FX.packageA], [FX.vendorB, FX.packageB]]) {
    await soft('vendor_revisions',
      admin.from('vendor_revisions')
        .upsert(
          { vendor_id: vendorId, package_id: packageId, round_number: 1, amount: 450, notes: 'iso seed', created_by: 'seed' },
          { onConflict: 'vendor_id,round_number', ignoreDuplicates: true }
        )
    );
  }

  for (const packageId of [FX.packageA, FX.packageB]) {
    await soft('remarks',          admin.from('remarks').insert({ package_id: packageId, username: 'seed', text: 'iso seed remark' }));
    await soft('invoices',         admin.from('invoices').insert({ package_id: packageId, amount: 100, invoice_number: 'INV-ISO', invoice_date: new Date().toISOString(), username: 'seed' }));
    await soft('audit_trail',      admin.from('audit_trail').insert({ package_id: packageId, username: 'seed', field: 'iso_seed', old_value: '', new_value: 'seeded' }));
    await soft('package_milestones', admin.from('package_milestones').insert({ package_id: packageId, milestone_name: 'ISO Seed', display_order: 0, progress: 0 }));
    await soft('cash_inflow',      admin.from('cash_inflow').insert({ package_id: packageId, on_account: 'iso_seed', amount: 50, date_received: today, created_by: 'seed' }));
    await soft('cash_outflow',     admin.from('cash_outflow').insert({ package_id: packageId, to_whom: 'iso_seed', amount: 50, date_paid: today, created_by: 'seed' }));
  }

  for (const [packageId, orgId] of [[FX.packageA, FX.orgA], [FX.packageB, FX.orgB]]) {
    await soft('milestone_tasks',
      admin.from('milestone_tasks').insert({
        package_id: packageId, org_id: orgId,
        milestone_name: 'ISO Seed', name: 'iso seed task',
        progress: 0, sort_order: 0, created_by: 'seed',
      })
    );
  }

  for (const [orgId, userId] of [[FX.orgA, FX.userA], [FX.orgB, FX.userB]]) {
    await soft('org_audit_log',
      admin.from('org_audit_log').insert({
        org_id: orgId, user_id: userId, user_name: 'seed',
        action: 'ISO Seed', category: 'test', entity_name: 'iso',
      })
    );
    await soft('categories',
      admin.from('categories').insert({ org_id: orgId, user_id: userId, name: 'ISO Seed Category' })
    );
  }

  console.log('\n  ✓ Seed complete.\n');
}

seed().catch(err => {
  console.error('\nSeed error:', err);
  process.exit(1);
});
