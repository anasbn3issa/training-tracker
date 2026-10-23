"use client";

import { useEffect } from "react";

/**
 * Keeps the screen on while mounted. The browser drops the lock whenever the
 * page is hidden (app switch, screen off), so it is re-acquired on return.
 */
export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
        if (released) lock.release();
      } catch {
        // Denied (e.g. battery saver). Nothing to do: the session still works.
      }
    };
    const onVisible = () => void acquire();

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release();
    };
  }, []);
}
