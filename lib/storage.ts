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
