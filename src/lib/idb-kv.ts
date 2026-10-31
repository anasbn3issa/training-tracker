import type { Kv } from "./sync";

// Minimal key-value store on IndexedDB: one database, one object store.

const STORE = "kv";

/** `dbName` is read on first use (client only), e.g. one database per user. */
export function idbKv(dbName: () => string): Kv {
  let db: Promise<IDBDatabase> | null = null;

  const open = () =>
    (db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName(), 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));

  async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  return {
    get: (key) => run("readonly", (s) => s.get(key)),
    set: async (key, value) => {
      await run("readwrite", (s) => s.put(value, key));
    },
  };
}
