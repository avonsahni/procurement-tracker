import { requireUser, HubShell } from "./shell";

// Team Hub — channel list (spec §7.1). Phase 2 renders the real list of
// channels scoped to the caller's organisation via the RLS server client.
export default async function CommunicationPage() {
  await requireUser();
  return <HubShell title="Team Hub" subtitle="All channels for your organisation" />;
}
