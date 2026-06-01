import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthUser } from '@/lib/auth';

/**
 * Returns a 403 response when the project status is not 'Active' and the caller
 * is not an org owner/admin. Returns null to allow the action to proceed.
 */
export async function assertProjectActive(
  supabase: SupabaseClient<any>,
  projectId: string,
  auth: AuthUser,
): Promise<NextResponse | null> {
  if (auth.orgRole === 'owner' || auth.orgRole === 'admin') return null;

  const { data } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .maybeSingle();

  if (data && data.status !== 'Active') {
    return NextResponse.json(
      { error: `Project is ${data.status} — only Active projects can be modified.` },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Looks up the project_id for a package then calls assertProjectActive.
 * Use this in routes that have only the package ID available.
 */
export async function assertPackageProjectActive(
  supabase: SupabaseClient<any>,
  pkgId: string,
  auth: AuthUser,
): Promise<NextResponse | null> {
  if (auth.orgRole === 'owner' || auth.orgRole === 'admin') return null;

  const { data: pkg } = await supabase
    .from('packages')
    .select('project_id')
    .eq('id', pkgId)
    .maybeSingle();

  if (!pkg) return null; // package not found — existing 404 handler covers this

  return assertProjectActive(supabase, pkg.project_id, auth);
}
