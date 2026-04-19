/**
 * Offline Sync Queue
 *
 * Stores failed/deferred mutations in IndexedDB and flushes them when
 * connectivity is restored.  Features:
 *  - Deduplication via idKey (prevents double-submission on retries)
 *  - Per-item maxRetries — items that exceed the limit are marked 'failed'
 *    instead of dropped, so the user can review them in the UI
 *  - Pub/sub listener API so the OfflineIndicator can track pending count
 *  - Auto-flush on 'online' event (1 500 ms stabilisation delay)
 */

import { db, SyncQueueItem } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────
export type EnqueueOptions = Omit<
  SyncQueueItem,
  'id' | 'idKey' | 'timestamp' | 'retries' | 'status'
>;

type SyncListener = (pendingCount: number) => void;

// ─── Manager ──────────────────────────────────────────────────────────────────
class SyncQueueManager {
  private isProcessing = false;
  private listeners = new Set<SyncListener>();

  // ── Enqueue ─────────────────────────────────────────────────────────────
  /**
   * Add a mutation to the offline queue.
   * Returns the generated idKey so the caller can display it in the UI.
   */
  async enqueue(options: EnqueueOptions): Promise<string> {
    const idKey = crypto.randomUUID();
    await db.syncQueue.add({
      ...options,
      idKey,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    });
    void this.notifyListeners();
    return idKey;
  }

  // ── Query ────────────────────────────────────────────────────────────────
  async getPendingCount(): Promise<number> {
    return db.syncQueue.where('status').equals('pending').count();
  }

  async getAll(): Promise<SyncQueueItem[]> {
    return db.syncQueue.orderBy('timestamp').toArray();
  }

  /** Remove a specific item — used when the user wants to discard a failed entry. */
  async remove(id: number): Promise<void> {
    await db.syncQueue.delete(id);
    void this.notifyListeners();
  }

  // ── Flush ────────────────────────────────────────────────────────────────
  /**
   * Process all pending items in chronological order.
   * Safe to call multiple times — concurrent calls are de-duped via the
   * `isProcessing` flag.
   */
  async flush(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return;

    this.isProcessing = true;
    try {
      // Process items in insertion order
      const pending = await db.syncQueue
        .where('status')
        .equals('pending')
        .sortBy('timestamp');

      for (const item of pending) {
        if (!navigator.onLine) break; // network dropped mid-flush, stop early
        await this.processItem(item);
      }
    } finally {
      this.isProcessing = false;
      void this.notifyListeners();
    }
  }

  // ── Internal: process one item ────────────────────────────────────────────
  private async processItem(item: SyncQueueItem): Promise<void> {
    // Lazy-import to avoid circular dependency (apiClient → syncQueue → apiClient)
    const { apiClient } = await import('@/lib/apiClient');

    try {
      await apiClient.request(item.endpoint, {
        method: item.method,
        body: item.body !== undefined ? JSON.stringify(item.body) : undefined,
      });

      // Success — remove from queue
      if (item.id !== undefined) {
        await db.syncQueue.delete(item.id);
      }
    } catch (error: unknown) {
      // Network-level failure — stop and leave the item pending
      const isNetworkError =
        !navigator.onLine ||
        (error instanceof Error && 'status' in error && (error as { status: number }).status === 0);

      if (isNetworkError) return;

      // Server-side error — increment retries or mark as failed
      if (item.id !== undefined) {
        const newRetries = item.retries + 1;
        if (newRetries >= item.maxRetries) {
          await db.syncQueue.update(item.id, {
            status: 'failed',
            retries: newRetries,
          });
        } else {
          await db.syncQueue.update(item.id, { retries: newRetries });
        }
      }
    }
  }

  // ── Pub / Sub ────────────────────────────────────────────────────────────
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners(): Promise<void> {
    const count = await this.getPendingCount();
    this.listeners.forEach((l) => l(count));
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
export const syncQueueManager = new SyncQueueManager();

// Auto-flush when the browser reports connectivity restored.
// The 1 500 ms delay gives the network stack time to stabilise before
// we start firing API requests.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(() => void syncQueueManager.flush(), 1500);
  });
}
