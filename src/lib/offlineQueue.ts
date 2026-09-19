/**
 * Offline queue for conductor scan actions.
 * Stores pending status transitions in localStorage when the network is unavailable.
 * Provides a clean, testable API that conductor/page.tsx calls directly.
 */

export interface QueueItem {
  waybillId: string;
  newStatus: string;
  timestamp: string; // ISO 8601
  retryCount: number;
}

export interface SyncResult {
  waybillId: string;
  success: boolean;
  error?: string;
  permanent?: boolean; // true if retryCount exceeded max
}

const STORAGE_KEY = "pettivandi_offline_queue";
const MAX_RETRIES = 5;

export function enqueue(item: Omit<QueueItem, "retryCount">): void {
  if (typeof window === "undefined") return;
  const current = dequeue();
  // Avoid duplicate entries for the same waybillId + status
  const exists = current.some(
    (q) => q.waybillId === item.waybillId && q.newStatus === item.newStatus,
  );
  if (exists) return;
  current.push({ ...item, retryCount: 0 });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function dequeue(): QueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

export function remove(waybillId: string): void {
  if (typeof window === "undefined") return;
  const current = dequeue().filter((q) => q.waybillId !== waybillId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

function persist(items: QueueItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Attempts to sync all queued items.
 * @param onItem - async function that performs the actual API call.
 *                 Should return true if successful, false if failed.
 * @returns Array of results per item.
 */
export async function flush(
  onItem: (item: QueueItem) => Promise<boolean>,
): Promise<SyncResult[]> {
  if (typeof window === "undefined") return [];
  const queue = dequeue();
  if (queue.length === 0) return [];

  const results: SyncResult[] = [];
  const remaining: QueueItem[] = [];

  for (const item of queue) {
    if (item.retryCount >= MAX_RETRIES) {
      results.push({
        waybillId: item.waybillId,
        success: false,
        error: `Exceeded max retries (${MAX_RETRIES}). Action could not be synced.`,
        permanent: true,
      });
      // Don't keep permanently failed items — remove them
      continue;
    }

    try {
      const success = await onItem(item);
      if (success) {
        results.push({ waybillId: item.waybillId, success: true });
        // Don't add back to remaining — effectively removed
      } else {
        remaining.push({ ...item, retryCount: item.retryCount + 1 });
        results.push({
          waybillId: item.waybillId,
          success: false,
          error: "Sync failed — will retry later",
        });
      }
    } catch {
      remaining.push({ ...item, retryCount: item.retryCount + 1 });
      results.push({
        waybillId: item.waybillId,
        success: false,
        error: "Network error during sync",
      });
    }
  }

  persist(remaining);
  return results;
}

export function getQueueCount(): number {
  return dequeue().length;
}
