import Dexie, { Table } from 'dexie';
import type { UserProfile } from '@/lib/auth';

// ─── Sync Queue Item ──────────────────────────────────────────────────────────
export interface SyncQueueItem {
  id?: number;           // auto-increment PK
  idKey: string;         // client UUID — used for deduplication on requeue
  endpoint: string;      // e.g. '/attendance/mark'
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'failed';
  label: string;         // human-readable label for UI: "Attendance — Class 8A"
  feature: string;       // feature tag: 'attendance' | 'test-submit' | 'annotation' etc.
}

// ─── Cached Auth Profile ──────────────────────────────────────────────────────
export interface CachedProfile {
  id: 'current';         // single-row table — always keyed as 'current'
  profile: UserProfile;
  cachedAt: number;
}

// ─── Key-Value Store (backing the TanStack Query persister) ───────────────────
export interface KeyvalEntry {
  key: string;
  value: unknown;
}

// ─── Database Definition ──────────────────────────────────────────────────────
class NuvanaDB extends Dexie {
  keyval!: Table<KeyvalEntry, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  cachedProfile!: Table<CachedProfile, string>;

  constructor() {
    super('nuvana360-db');

    this.version(1).stores({
      // key-value: just the primary key
      keyval: 'key',

      // sync queue: auto-increment id, plus searchable fields
      syncQueue: '++id, idKey, status, timestamp, feature',

      // single-row profile cache
      cachedProfile: 'id',
    });
  }
}

export const db = new NuvanaDB();

// ─── Auth Profile Helpers ─────────────────────────────────────────────────────

/** Persist the authenticated user's profile to IndexedDB. */
export async function cacheProfile(profile: UserProfile): Promise<void> {
  await db.cachedProfile.put({ id: 'current', profile, cachedAt: Date.now() });
}

/**
 * Retrieve the last cached profile.
 * Returns null if no profile has been cached yet.
 */
export async function getCachedProfile(): Promise<UserProfile | null> {
  const entry = await db.cachedProfile.get('current');
  return entry?.profile ?? null;
}

/** Remove the cached profile (called on logout). */
export async function clearCachedProfile(): Promise<void> {
  await db.cachedProfile.delete('current');
}

// ─── Query-Cache Persister Storage ───────────────────────────────────────────
/**
 * Thin async key-value adapter used by the TanStack Query persister.
 * Stores the serialised query cache as a single blob under 'query-cache'.
 */
export const idbKeyval = {
  async get(key: string): Promise<unknown> {
    const entry = await db.keyval.get(key);
    return entry?.value;
  },

  async set(key: string, value: unknown): Promise<void> {
    await db.keyval.put({ key, value });
  },

  async del(key: string): Promise<void> {
    await db.keyval.delete(key);
  },

  /** Clear the entire key-value store (called on logout to prevent cross-user data leaks). */
  async clear(): Promise<void> {
    await db.keyval.clear();
  },
};

/** Convenience: clear only the persisted query cache entry. */
export async function clearQueryCache(): Promise<void> {
  await idbKeyval.del('query-cache');
}
