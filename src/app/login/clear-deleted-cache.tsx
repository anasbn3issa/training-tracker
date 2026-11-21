"use client";

import { useEffect } from "react";
import { CLEAR_CACHE_KEY } from "@/lib/account-api";
import { userCacheName } from "@/lib/idb-kv";

/** After an account deletion: removes that user's offline copy from this phone (no page holds it open here). */
export function ClearDeletedCache() {
  useEffect(() => {
    try {
      const userId = sessionStorage.getItem(CLEAR_CACHE_KEY);
      if (!userId) return;
      sessionStorage.removeItem(CLEAR_CACHE_KEY);
      indexedDB.deleteDatabase(userCacheName(userId));
    } catch {
      // Storage blocked (private mode): nothing was cached, nothing to clear.
    }
  }, []);
  return null;
}
