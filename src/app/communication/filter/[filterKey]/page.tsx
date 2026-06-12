import { requireUser, HubShell } from "../../shell";

// Team Hub — filtered global views (spec §2, §7.1):
//   mentions          → threads where I'm mentioned
//   open              → all open threads across the tenant
//   project-<uuid>    → threads belonging to one project
// Phase 3 implementation.
export default async function FilterPage({
  params,
}: {
  params: Promise<{ filterKey: string }>;
}) {
  await requireUser();
  const { filterKey } = await params;
  return <HubShell title="Filtered view" subtitle={`Filter: ${filterKey}`} />;
}
