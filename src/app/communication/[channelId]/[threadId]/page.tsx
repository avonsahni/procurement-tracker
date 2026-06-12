import { requireUser, HubShell } from "../../shell";

// Team Hub — single thread view: messages, composer, mentions
// (spec §7.1). Phase 2 implementation.
export default async function ThreadPage({
  params,
}: {
  params: Promise<{ channelId: string; threadId: string }>;
}) {
  await requireUser();
  const { threadId } = await params;
  return <HubShell title="Thread" subtitle={`Thread ${threadId} — messages`} />;
}
