import type { Kv } from "./sync";

// Minimal key-value store on IndexedDB: one database, one object store.

const DB_NAME = "training-tracker";
const STORE = "kv";

export function idbKv(): Kv {
  let db: Promise<IDBDatabase> | null = null;

  const open = () =>
    (db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
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
