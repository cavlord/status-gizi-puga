/**
 * Safe storage wrapper with fallback for Safari ITP and private browsing.
 * Tries localStorage first, falls back to sessionStorage, then in-memory.
 */

const memoryStore = new Map<string, string>();

function isStorageAvailable(storage: Storage): boolean {
  try {
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const primaryStorage = typeof window !== 'undefined' && isStorageAvailable(window.localStorage)
  ? window.localStorage
  : typeof window !== 'undefined' && isStorageAvailable(window.sessionStorage)
    ? window.sessionStorage
    : null;

export const safeStorage = {
  getItem(key: string): string | null {
    if (primaryStorage) {
      return primaryStorage.getItem(key);
    }
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    if (primaryStorage) {
      try {
        primaryStorage.setItem(key, value);
      } catch {
        memoryStore.set(key, value);
      }
    } else {
      memoryStore.set(key, value);
    }
  },

  removeItem(key: string): void {
    if (primaryStorage) {
      primaryStorage.removeItem(key);
    }
    memoryStore.delete(key);
  },
};