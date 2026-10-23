"use client";

import { useEffect } from "react";

/** Registers the service worker (public/sw.js) in production builds only: in dev it would cache stale code. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(`/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID}`, { scope: "/", updateViaCache: "none" })
      .catch((e) => console.error("service worker registration failed", e));
  }, []);
  return null;
}
