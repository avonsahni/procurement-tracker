import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * GET /api/user/data-export
 *
 * GDPR Art. 20 — data portability. Returns all personal data the platform
 * holds for the authenticated user as a JSON download.
 *
 * Accessible by any logged-in user (no admin required).
 * Only returns data for the requesting user — no cross-user access.
 */
export async function GET() {
  const auth = await guard('user');
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminSupabase();
  const userId = auth.id;

  // Fetch everything tied to this user in parallel
  const [
    profileRes,
    membershipsRes,
    remarksRes,
    auditRes,
    orgAuditRes,
  ] = await Promise.all([
    // Profile
    admin.from('profiles')
      .select('id, full_name, can_edit, is_platform_admin, created_at')
      .eq('id', userId)
      .maybeSingle(),

    // Org memberships
    admin.from('organization_members')
      .select('org_id, role, created_at, organizations(name)')
      .eq('user_id', userId),

    // Remarks authored by this user
    admin.from('remarks')
      .select('id, package_id, text, timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false }),

    // Package audit trail entries authored by this user
    admin.from('audit_trail')
      .select('id, package_id, field, old_value, new_value, timestamp')
      .eq('username', auth.fullName)
      .order('timestamp', { ascending: false })
      .limit(500),

    // Org audit log entries authored by this user
    admin.from('org_audit_log')
      .select('id, org_id, action, category, entity_name, details, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    requestedBy: auth.email,
    notice: 'This file contains all personal data stored for your account under GDPR Art. 20 (data portability).',

    account: {
      id: userId,
      email: auth.email,
      fullName: auth.fullName,
      canEdit: profileRes.data?.can_edit ?? true,
      accountCreatedAt: profileRes.data?.created_at ?? null,
    },

    organisations: (membershipsRes.data || []).map((m: any) => ({
      orgId:   m.org_id,
      orgName: m.organizations?.name ?? '',
      role:    m.role,
      joinedAt: m.created_at,
    })),

    remarks: (remarksRes.data || []).map((r: any) => ({
      id:        r.id,
      packageId: r.package_id,
      text:      r.text,
      postedAt:  r.timestamp,
    })),

    packageAuditTrail: (auditRes.data || []).map((a: any) => ({
      id:        a.id,
      packageId: a.package_id,
      field:     a.field,
      oldValue:  a.old_value,
      newValue:  a.new_value,
      timestamp: a.timestamp,
    })),

    adminActions: (orgAuditRes.data || []).map((e: any) => ({
      id:         e.id,
      orgId:      e.org_id,
      action:     e.action,
      category:   e.category,
      entityName: e.entity_name,
      details:    e.details,
      performedAt: e.created_at,
    })),
  };

  // Return as a downloadable JSON file
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="my-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
