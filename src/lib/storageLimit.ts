// Storage limit constants and helpers

export const ORG_STORAGE_LIMIT_BYTES = 20 * 1024 * 1024 * 1024; // 20 GB

export function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function storagePct(usedBytes: number, limitBytes = ORG_STORAGE_LIMIT_BYTES): number {
  return Math.min(100, Math.round((usedBytes / limitBytes) * 100));
}
