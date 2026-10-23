// Service worker: makes the app open with no signal.
//
// - Pages (navigations): network first, cached copy if the network fails or is
//   slower than NETWORK_TIMEOUT_MS. Only real pages are cached, never redirects (login).
// - /_next/static/*: cache first (file names are content hashed).
// - /api/* and everything else: untouched. Data offline is handled by IndexedDB (src/lib/sync.ts).
//
// Registered as /sw.js?v=<build id>: every deploy installs a fresh worker with its own cache.

const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = `tt-${VERSION}`;
const PAGES = ["/", "/session", "/history", "/run"];
const NETWORK_TIMEOUT_MS = 3000;

const isCacheablePage = (res) => res.ok && !res.redirected && res.type === "basic";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const assets = new Set();
      for (const page of PAGES) {
        const res = await fetch(page, { credentials: "same-origin", cache: "no-store" });
        if (!isCacheablePage(res)) continue;
        // The JS/CSS the page needs: on the first visit they loaded before this worker existed.
        for (const [path] of (await res.clone().text()).matchAll(/\/_next\/static\/[^"'\\\s)]+/g)) assets.add(path);
        await cache.put(page, res);
      }
      await cache.addAll([...assets, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirstPage(event) {
  const { request } = event;
  const cache = await caches.open(CACHE);
  const key = new URL(request.url).pathname;

  const network = fetch(request).then(async (res) => {
    if (isCacheablePage(res)) await cache.put(key, res.clone());
    return res;
  });
  event.waitUntil(network.catch(() => {})); // keep refreshing the cache even after a timeout

  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch {
    // offline: fall through to the cache
  }
  return (await cache.match(key)) || (await cache.match("/")) || network;
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}
