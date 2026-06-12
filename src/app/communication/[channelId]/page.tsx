import { requireUser, HubShell } from "../shell";

// Team Hub — single channel view: its threads ordered by recent activity
// (spec §7.1). Phase 2 implementation.
export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  await requireUser();
  const { channelId } = await params;
  return <HubShell title="Channel" subtitle={`Channel ${channelId} — threads`} />;
}
