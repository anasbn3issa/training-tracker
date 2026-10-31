"use client";

import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { idbKv } from "@/lib/idb-kv";
import { SyncStore, type Snapshot } from "@/lib/sync";
import { localIsoDate } from "@/lib/today";
import { currentUserId } from "@/lib/user-cookie";
import type { Op } from "@/lib/types";

type Data = Snapshot & {
  /** Applies writes to local state and IndexedDB immediately; syncs in the background. */
  apply: (ops: Op[]) => void;
};

const DataContext = createContext<Data | null>(null);

function createStore() {
  return new SyncStore({
    // One offline cache per user, so a shared phone never mixes their data.
    kv: idbKv(() => `training-tracker-${currentUserId()}`),
    // Before multi-user there was one cache, and it was Anas's: adopt anything still unsent.
    legacyKv: currentUserId() === "anas" ? idbKv(() => "training-tracker") : undefined,
    fetch: (url, init) => fetch(url, init),
    schedule: (fn, ms) => setTimeout(fn, ms),
    today: () => localIsoDate(new Date()),
    onUnauthorized: () => window.location.replace("/login"),
  });
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createStore);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    if (!currentUserId()) {
      window.location.replace("/login");
      return;
    }
    void store.start();
    const onVisible = () => document.visibilityState === "visible" && store.sync();
    window.addEventListener("online", store.sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", store.sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [store]);

  return <DataContext value={{ ...snapshot, apply: store.apply }}>{children}</DataContext>;
}

export function useData(): Data {
  const data = use(DataContext);
  if (!data) throw new Error("useData must be used inside <DataProvider>");
  return data;
}
