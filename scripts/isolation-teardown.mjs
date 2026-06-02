#!/usr/bin/env node
/**
 * Removes all test fixtures created by isolation-seed.mjs.
 *
 * Deletion order:
 *   1. Auth users (cascades → profiles, organization_members via FK)
 *   2. Organizations (cascades → projects → packages → all child tables via FK)
 *
 * Required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').origin; } catch { return ''; } })();
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FX = {
  userA: '10000000-0000-0000-0000-a00000000001',
  userB: '20000000-0000-0000-0000-b00000000002',
  orgA:  '10000000-0000-0000-0000-000000000001',
  orgB:  '20000000-0000-0000-0000-000000000002',
};

async function teardown() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  console.log('\n── Tearing down tenant isolation fixtures ──────────────\n');

  // Delete auth users first — cascades to profiles and organization_members.
  for (const [label, id] of [['A', FX.userA], ['B', FX.userB]]) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error && !error.message?.includes('not found') && !error.message?.includes('User not found')) {
      console.warn(`  ⚠  deleteUser ${label}: ${error.message}`);
    } else {
      console.log(`  ✓ user-${label} deleted`);
    }
  }

  // Delete organizations — cascades to projects → packages → all child tables.
  const { error: orgErr } = await admin
    .from('organizations')
    .delete()
    .in('id', [FX.orgA, FX.orgB]);
  if (orgErr) {
    console.warn(`  ⚠  organizations delete: ${orgErr.message}`);
  } else {
    console.log('  ✓ organizations (+ all cascaded data) deleted');
  }

  console.log('\n  ✓ Teardown complete.\n');
}

teardown().catch(err => {
  console.error('\nTeardown error:', err);
  process.exit(1);
});
