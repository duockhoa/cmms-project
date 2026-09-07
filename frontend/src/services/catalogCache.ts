/**
 * Master Catalog Data Cache Service
 * Provides in-memory + sessionStorage caching with Stale-While-Revalidate and TTL.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_PREFIX = 'dk_cmms_catalog_';

class CatalogCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();

  /**
   * Save data into memory and sessionStorage
   */
  set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    this.memoryCache.set(key, entry);

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
      }
    } catch {
      // Ignore quota exceeded or storage unavailable errors
    }
  }

  /**
   * Get cached entry from memory or sessionStorage
   */
  get<T>(key: string): { data: T; isStale: boolean } | null {
    let entry: CacheEntry<T> | undefined = this.memoryCache.get(key);

    if (!entry && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const stored = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (stored) {
          entry = JSON.parse(stored);
          if (entry) {
            this.memoryCache.set(key, entry);
          }
        }
      } catch {
        // Corrupted cache in sessionStorage
      }
    }

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    const isStale = age > entry.ttl;

    return {
      data: entry.data,
      isStale,
    };
  }

  /**
   * Stale-While-Revalidate pattern:
   * Returns cached data immediately if present (even if stale),
   * and asynchronously fetches fresh data in the background.
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL_MS
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached) {
      if (cached.isStale) {
        // Revalidate in background without blocking
        fetcher()
          .then((freshData) => {
            this.set(key, freshData, ttlMs);
          })
          .catch((err) => {
            console.warn(`[CatalogCache] Background revalidation failed for ${key}:`, err);
          });
      }
      return cached.data;
    }

    // No cache: fetch synchronously
    const freshData = await fetcher();
    this.set(key, freshData, ttlMs);
    return freshData;
  }

  /**
   * Invalidate a specific catalog cache key or prefix
   */
  invalidate(keyPattern: string): void {
    if (keyPattern === 'all') {
      this.memoryCache.clear();
      if (typeof window !== 'undefined' && window.sessionStorage) {
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith(CACHE_PREFIX)) {
            sessionStorage.removeItem(k);
          }
        });
      }
      return;
    }

    // Invalidate keys that start with or match keyPattern
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((_, k) => {
      if (k.startsWith(keyPattern) || k === keyPattern) {
        keysToDelete.push(k);
      }
    });

    keysToDelete.forEach((k) => this.memoryCache.delete(k));

    if (typeof window !== 'undefined' && window.sessionStorage) {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith(`${CACHE_PREFIX}${keyPattern}`)) {
          sessionStorage.removeItem(k);
        }
      });
    }
  }
}

export const catalogCache = new CatalogCacheService();
