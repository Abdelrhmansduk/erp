/**
 * Enterprise Resilient Storage Engine (IndexedDB + In-Memory Write-Through Cache + Quota-Safe LocalStorage)
 * Prevents 5MB Browser LocalStorage QuotaExceededError on large ledgers, trial balances, and BOQ sheets.
 */

const IDB_DATABASE_NAME = 'ALSULAIM_ERP_IDB_V1';
const IDB_DATABASE_VERSION = 1;
const IDB_STORE_NAME = 'erp_kv_store';
const DEFAULT_MAX_LOCALSTORAGE_BYTES = 1_800_000; // ~1.8 MB per key safety threshold

interface StoredEnvelope<T = unknown> {
  key: string;
  value: T;
  updatedAt: string;
  byteSize: number;
}

class ErpIndexedStorageEngine {
  private memoryCache = new Map<string, unknown>();
  private localStorageMirroredKeys = new Set<string>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private hydrationInFlight = new Set<string>();

  /**
   * Check whether IndexedDB API is available in the current runtime environment
   */
  public isIndexedDbSupported(): boolean {
    return typeof globalThis !== 'undefined' && typeof globalThis.indexedDB !== 'undefined' && globalThis.indexedDB !== null;
  }

  /**
   * Lazily open the IndexedDB database connection
   */
  private openDb(): Promise<IDBDatabase | null> {
    if (!this.isIndexedDbSupported()) {
      return Promise.resolve(null);
    }
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = globalThis.indexedDB.open(IDB_DATABASE_NAME, IDB_DATABASE_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
            db.createObjectStore(IDB_STORE_NAME, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Asynchronously read a value from IndexedDB (falling back to memoryCache and localStorage)
   */
  public async getAsync<T>(key: string, fallback?: T): Promise<T | undefined> {
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) as T;
    }

    const db = await this.openDb();
    if (db) {
      const idbResult = await new Promise<T | undefined>((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE_NAME, 'readonly');
          const store = tx.objectStore(IDB_STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => {
            const record = req.result as StoredEnvelope<T> | undefined;
            resolve(record ? record.value : undefined);
          };
          req.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      });

      if (idbResult !== undefined) {
        this.memoryCache.set(key, idbResult);
        return idbResult;
      }
    }

    // Fallback to localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          const parsed = JSON.parse(raw) as T;
          this.memoryCache.set(key, parsed);
          return parsed;
        }
      }
    } catch {
      // Ignore parse or security errors
    }

    return fallback;
  }

  /**
   * Asynchronously persist a value into IndexedDB and update the write-through memory cache
   */
  public async setAsync<T>(key: string, value: T): Promise<boolean> {
    this.memoryCache.set(key, value);

    const db = await this.openDb();
    if (!db) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(IDB_STORE_NAME);
        let byteSize = 0;
        try {
          byteSize = JSON.stringify(value).length;
        } catch {
          byteSize = 0;
        }

        const envelope: StoredEnvelope<T> = {
          key,
          value,
          updatedAt: new Date().toISOString(),
          byteSize,
        };

        const req = store.put(envelope);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Asynchronously remove a key from IndexedDB, memoryCache, and localStorage
   */
  public async removeAsync(key: string): Promise<boolean> {
    this.memoryCache.delete(key);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }

    const db = await this.openDb();
    if (!db) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(IDB_STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Synchronous read with write-through memory cache and automatic background IndexedDB hydration
   */
  public getSync<T>(key: string, fallback: T): T {
    if (this.memoryCache.has(key)) {
      if (this.localStorageMirroredKeys.has(key) && typeof localStorage !== 'undefined') {
        try {
          if (localStorage.getItem(key) === null) {
            this.memoryCache.delete(key);
            this.localStorageMirroredKeys.delete(key);
          } else {
            return this.memoryCache.get(key) as T;
          }
        } catch {
          return this.memoryCache.get(key) as T;
        }
      } else {
        return this.memoryCache.get(key) as T;
      }
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          const parsed = JSON.parse(raw) as T;
          this.memoryCache.set(key, parsed);
          this.localStorageMirroredKeys.add(key);
          return parsed;
        }
      }
    } catch {
      // Ignore parse or security errors
    }

    // Trigger non-blocking background hydration from IndexedDB
    if (this.isIndexedDbSupported() && !this.hydrationInFlight.has(key)) {
      this.hydrationInFlight.add(key);
      void this.getAsync<T>(key).then((hydrated) => {
        this.hydrationInFlight.delete(key);
        if (hydrated !== undefined && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('alsulaim_erp_storage_hydrated', {
              detail: { key, updatedAt: new Date().toISOString() },
            })
          );
        }
      });
    }

    return fallback;
  }

  /**
   * Synchronous quota-guarded write:
   * 1. Immediately updates in-memory write-through cache (0ms latency).
   * 2. Safely writes to localStorage if payload is within threshold; catches QuotaExceededError gracefully.
   * 3. Queues asynchronous IndexedDB persistence for unlimited capacity.
   */
  public setSync<T>(
    key: string,
    value: T,
    options?: { maxLocalStorageBytes?: number }
  ): { storedInMemory: boolean; storedInLocalStorage: boolean; queuedForIdb: boolean } {
    this.memoryCache.set(key, value);

    let storedInLocalStorage = false;
    const maxBytes = options?.maxLocalStorageBytes ?? DEFAULT_MAX_LOCALSTORAGE_BYTES;

    try {
      if (typeof localStorage !== 'undefined') {
        const serialized = JSON.stringify(value);
        if (serialized.length <= maxBytes) {
          localStorage.setItem(key, serialized);
          storedInLocalStorage = true;
          this.localStorageMirroredKeys.add(key);
        } else {
          // Payload exceeds safe LocalStorage threshold; remove stale LocalStorage entry and rely on IndexedDB + Memory
          localStorage.removeItem(key);
          this.localStorageMirroredKeys.delete(key);
        }
      }
    } catch {
      // QuotaExceededError or private browsing restriction — safely absorbed by memoryCache + IndexedDB
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch {
        // Ignore
      }
      this.localStorageMirroredKeys.delete(key);
      storedInLocalStorage = false;
    }

    const queuedForIdb = this.isIndexedDbSupported();
    if (queuedForIdb) {
      void this.setAsync(key, value);
    }

    return {
      storedInMemory: true,
      storedInLocalStorage,
      queuedForIdb,
    };
  }

  /**
   * Synchronously clear a key from memory and localStorage, and queue IndexedDB deletion
   */
  public removeSync(key: string): void {
    this.memoryCache.delete(key);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
    if (this.isIndexedDbSupported()) {
      void this.removeAsync(key);
    }
  }

  /**
   * Clear in-memory cache (useful in unit tests)
   */
  public clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Diagnostic metrics for storage health inspection
   */
  public getStorageDiagnostics(): {
    memoryKeysCount: number;
    localStorageUsedBytes: number;
    idbSupported: boolean;
  } {
    let localStorageUsedBytes = 0;
    try {
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) {
            const v = localStorage.getItem(k) || '';
            localStorageUsedBytes += k.length + v.length;
          }
        }
      }
    } catch {
      localStorageUsedBytes = 0;
    }

    return {
      memoryKeysCount: this.memoryCache.size,
      localStorageUsedBytes,
      idbSupported: this.isIndexedDbSupported(),
    };
  }
}

export const erpIndexedStorage = new ErpIndexedStorageEngine();
