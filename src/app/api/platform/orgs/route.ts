import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

// Platform-admin only: returns ALL organisations with member/project counts and owner emails.
export async function GET() {
  const auth = await guard('platform');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();

  // All organisations (admin client bypasses RLS)
  const { data: orgs, error: orgsErr } = await admin
    .from('organizations')
    .select('id, name, plan, subscription_status, trial_ends_at, paused_at, paused_reason, platform_notes, created_at')
    .order('created_at', { ascending: false });

  if (orgsErr) return NextResponse.json({ error: orgsErr.message }, { status: 500 });
  if (!orgs || orgs.length === 0) return NextResponse.json([]);

  const orgIds = orgs.map((o: any) => o.id);

  // Members, projects, storage, and all auth users — fetch in parallel
  const [membersRes, projectsRes, storageRes, authRes] = await Promise.all([
    admin.from('organization_members').select('org_id, user_id, role').in('org_id', orgIds),
    admin.from('projects').select('id, org_id').in('org_id', orgIds),
    admin.from('org_storage_bytes').select('org_id, used_bytes').in('org_id', orgIds),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // Build email lookup
  const emailById: Record<string, string> = {};
  for (const u of authRes.data?.users || []) {
    emailById[u.id] = u.email ?? '';
  }

  // Group members and owners by org
  const memberCountByOrg: Record<string, number> = {};
  const ownerEmailsByOrg: Record<string, string[]> = {};
  for (const m of membersRes.data || []) {
    memberCountByOrg[m.org_id] = (memberCountByOrg[m.org_id] || 0) + 1;
    if (m.role === 'owner') {
      if (!ownerEmailsByOrg[m.org_id]) ownerEmailsByOrg[m.org_id] = [];
      const email = emailById[m.user_id];
      if (email) ownerEmailsByOrg[m.org_id].push(email);
    }
  }

  // Count projects per org
  const projectCountByOrg: Record<string, number> = {};
  for (const p of projectsRes.data || []) {
    projectCountByOrg[p.org_id] = (projectCountByOrg[p.org_id] || 0) + 1;
  }

  // Storage bytes per org
  const storageByOrg: Record<string, number> = {};
  for (const s of storageRes.data || []) {
    storageByOrg[(s as any).org_id] = Number((s as any).used_bytes) || 0;
  }

  const result = orgs.map((org: any) => ({
    ...org,
    memberCount:  memberCountByOrg[org.id]  || 0,
    projectCount: projectCountByOrg[org.id] || 0,
    ownerEmails:  ownerEmailsByOrg[org.id]  || [],
    usedBytes:    storageByOrg[org.id]      || 0,
  }));

  return NextResponse.json(result);
}
