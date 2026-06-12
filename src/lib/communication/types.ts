// Team Hub — shared types mirroring supabase/migrations/039_team_hub.sql.
// Phase 1 scaffold: data-access functions and realtime hooks land in Phase 2+.

export type ChannelType = "project" | "general" | "direct" | "entity";
export type EntityType = "package" | "milestone" | "budget_line";
export type ThreadStatus = "open" | "resolved" | "closed";
export type ThreadRole = "owner" | "participant" | "watcher";
export type ChannelRole = "admin" | "member";

export interface Channel {
  id: string;
  orgId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  type: ChannelType;
  entityType: EntityType | null;
  entityId: string | null;
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
  archivedAt: string | null;
}

export interface Thread {
  id: string;
  channelId: string;
  orgId: string;
  title: string;
  status: ThreadStatus;
  createdBy: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  lastMessageAt: string | null;
  messageCount: number;
}

export interface Message {
  id: string;
  threadId: string;
  channelId: string;
  orgId: string;
  authorId: string;
  body: string;
  bodyRich: unknown | null;
  parentMessageId: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface Mention {
  id: string;
  messageId: string;
  threadId: string;
  channelId: string;
  orgId: string;
  mentionedUserId: string;
  readAt: string | null;
  createdAt: string;
}

export interface ThreadParticipant {
  threadId: string;
  userId: string;
  orgId: string;
  role: ThreadRole;
  muted: boolean;
  lastReadMessageId: string | null;
  joinedAt: string;
}

export interface ChannelMember {
  channelId: string;
  userId: string;
  orgId: string;
  role: ChannelRole;
  joinedAt: string;
}

export interface Attachment {
  id: string;
  messageId: string;
  orgId: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

/** Global filter keys for /communication/filter/[filterKey] (spec §2). */
export type FilterKey = "mentions" | "open" | `project-${string}`;
