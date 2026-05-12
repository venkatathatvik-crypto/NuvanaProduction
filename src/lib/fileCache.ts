/**
 * File Cache Utility
 *
 * Provides a programmatic API for explicitly caching files (PDFs, audio, video)
 * into the Workbox "nuvana360-files-v1" cache for offline use.
 *
 * Workbox automatically caches Supabase storage files on first access, so in
 * most cases you don't need this module.  Use it when you want to:
 *   - Pre-cache a file before the user navigates to it (prefetch)
 *   - Show a "Save for offline" button in the UI
 *   - Check whether a specific file is already cached
 *   - Remove a specific file from the cache
 *
 * The cache name must match the one declared in vite.config.ts:
 *   cacheName: "nuvana360-files-v1"
 */

const CACHE_NAME = 'nuvana360-files-v1';

/** Returns true when the Cache Storage API is available (not available in SSR). */
function isCacheSupported(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

/**
 * Check whether a file URL is already in the offline cache.
 *
 * @param url  Absolute URL of the file (e.g. a Supabase public URL)
 * @returns    true if cached, false if not cached or Cache Storage unavailable
 */
export async function isFileCached(url: string): Promise<boolean> {
  if (!isCacheSupported()) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    return match !== undefined;
  } catch {
    return false;
  }
}

/**
 * Download a file and add it to the offline cache.
 * Safe to call if the file is already cached — it will simply overwrite it
 * (keeping the cache entry fresh).
 *
 * @param url       Absolute URL of the file to cache
 * @param onProgress Optional callback receiving bytes downloaded so far
 *                   (only fires if the server sends Content-Length)
 * @returns         true on success, false on failure (network error, etc.)
 */
export async function cacheFile(
  url: string,
  onProgress?: (loaded: number, total: number | null) => void
): Promise<boolean> {
  if (!isCacheSupported()) return false;

  try {
    const response = await fetch(url, { mode: 'cors' });

    if (!response.ok) return false;

    // If the caller wants progress, stream the body manually
    if (onProgress && response.body) {
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : null;

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        onProgress(loaded, total);
      }

      // Reconstruct response from streamed chunks to store in cache
      const blob = new Blob(chunks);
      const cachedResponse = new Response(blob, {
        status: response.status,
        headers: response.headers,
      });

      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, cachedResponse);
    } else {
      // No progress needed — put the response directly
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, response);
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a specific file from the offline cache.
 *
 * @param url  Absolute URL of the file to remove
 * @returns    true if the entry was found and deleted, false otherwise
 */
export async function removeCachedFile(url: string): Promise<boolean> {
  if (!isCacheSupported()) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    return cache.delete(url);
  } catch {
    return false;
  }
}

/**
 * Return the total number of files currently in the offline cache.
 */
export async function getCachedFileCount(): Promise<number> {
  if (!isCacheSupported()) return 0;
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    return keys.length;
  } catch {
    return 0;
  }
}

/**
 * Return a list of all cached file URLs.
 */
export async function getCachedFileUrls(): Promise<string[]> {
  if (!isCacheSupported()) return [];
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    return keys.map((req) => req.url);
  } catch {
    return [];
  }
}

/**
 * Clear all files from the offline file cache.
 * Does NOT affect the app-shell cache or other Workbox caches.
 */
export async function clearFileCache(): Promise<void> {
  if (!isCacheSupported()) return;
  try {
    await caches.delete(CACHE_NAME);
  } catch {
    // ignore
  }
}
