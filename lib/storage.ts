// Lightweight persistent storage wrapper.
// On web (the default platform for this project), uses window.localStorage.
// On native, falls back to an in-memory Map (data survives the session).

const memoryStore = new Map<string, string>();

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // localStorage may throw in some environments
  }
  return null;
}

export function getItem(key: string): string | null {
  const storage = getStorage();
  if (storage) {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }
  return memoryStore.get(key) ?? null;
}

export function setItem(key: string, value: string): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(key, value);
      return;
    } catch {
      // fall through to memory
    }
  }
  memoryStore.set(key, value);
}

export function removeItem(key: string): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(key);
      return;
    } catch {
      // fall through
    }
  }
  memoryStore.delete(key);
}

// Typed helpers for JSON objects
export function getJSON<T>(key: string, fallback: T): T {
  const raw = getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON<T>(key: string, value: T): void {
  try {
    setItem(key, JSON.stringify(value));
  } catch {
    // ignore serialization errors
  }
}

export interface DateStampedPayload<T> {
  date: string; // e.g. "2026-08-31" or "31.08.26"
  timestamp: number;
  data: T;
}

/**
 * Retrieves cached data only if it was saved for the exact expected date.
 * If the cached data is missing, expired, or from a different date, it immediately purges the key and returns fallback.
 */
export function getDateStampedJSON<T>(key: string, expectedDate: string, fallback: T): T {
  const raw = getItem(key);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    // Support both wrapped DateStampedPayload and direct objects
    if (parsed && typeof parsed === 'object') {
      if ('date' in parsed && 'data' in parsed) {
        if (parsed.date === expectedDate && parsed.data !== undefined && parsed.data !== null) {
          return parsed.data as T;
        }
        // Stale date detected - purge immediately
        removeItem(key);
        return fallback;
      }
      if ('date' in parsed && parsed.date === expectedDate) {
        return parsed as T;
      }
    }
  } catch {
    removeItem(key);
  }

  return fallback;
}

/**
 * Stores data wrapped with an explicit date stamp and creation timestamp.
 */
export function setDateStampedJSON<T>(key: string, date: string, data: T): void {
  const payload: DateStampedPayload<T> = {
    date,
    timestamp: Date.now(),
    data,
  };
  setJSON(key, payload);
}

/**
 * Clears any known stale daily caching keys across localStorage and sessionStorage.
 */
export function purgeStaleStorageKeys(currentDate: string): void {
  try {
    if (typeof window === 'undefined') return;

    const storages = [window.localStorage, window.sessionStorage].filter(Boolean);
    for (const storage of storages) {
      if (!storage) continue;
      const keysToExamine: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k) keysToExamine.push(k);
      }

      for (const k of keysToExamine) {
        if (
          k.startsWith('daily_murli_sync_') ||
          k.startsWith('connectgod_murli_parsed_') ||
          k === 'connectgod_remote_varadanam_data' ||
          k === 'connectgod_auto_content_cache' ||
          k === 'connectgod_varadan_data'
        ) {
          try {
            const val = storage.getItem(k);
            if (val) {
              const parsed = JSON.parse(val);
              const itemDate = parsed?.date || (parsed?.data && parsed.data.date);
              if (itemDate && itemDate !== currentDate && !k.endsWith(currentDate)) {
                storage.removeItem(k);
              }
            }
          } catch {
            storage.removeItem(k);
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Storage] Purge error:', e);
  }
}

