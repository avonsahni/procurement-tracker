import type { OrgPlan } from '@/lib/auth';

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** Per-plan storage caps in bytes. */
export const PLAN_STORAGE_LIMITS: Record<OrgPlan, number> = {
  trial:      25  * MB,   //  25 MB  — free tier
  starter:     5  * GB,   //   5 GB
  pro:        20  * GB,   //  20 GB
  enterprise: 100 * GB,   // 100 GB
};

/** Kept for any callers that don't have a plan context. */
export const ORG_STORAGE_LIMIT_BYTES = PLAN_STORAGE_LIMITS.pro;

export function storageLimitForPlan(plan: OrgPlan): number {
  return PLAN_STORAGE_LIMITS[plan] ?? PLAN_STORAGE_LIMITS.trial;
}

export function humanBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < MB)          return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < GB)          return `${(bytes / MB).toFixed(1)} MB`;
  return `${(bytes / GB).toFixed(2)} GB`;
}

export function storagePct(usedBytes: number, limitBytes = ORG_STORAGE_LIMIT_BYTES): number {
  return Math.min(100, Math.round((usedBytes / limitBytes) * 100));
}
