// Protean service worker — offline support for the gym, hand-rolled per project
// convention (no workbox, same reason there is no chart lib or router).
//
// Strategy:
//  - navigations: network-first, falling back to the cached shell. Online users always
//    get the freshest index.html, which references content-hashed /assets/ files, so a
//    new deploy propagates on the next online load with no version dance.
//  - same-origin static requests: cache-first, filled at runtime. Hashed filenames make
//    them immutable, so a cache hit is always correct.
//  - the athlete's DATA never passes through here — it lives in localStorage, which is
//    exactly why the app works with no signal in the first place.
//
// CACHE bump: only needed if this file's LOGIC changes incompatibly. Deploys of the app
// itself never require one (see navigation strategy above). Old hashed assets linger in
// the cache until the next bump; they are small and harmless.
const CACHE = "protean-sw-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          // Stable key: every route serves the SPA shell (netlify.toml redirect).
          cache.put("/__shell", res.clone());
          return res;
        } catch {
          const shell = await caches.match("/__shell");
          return shell ?? Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && (res.type === "basic" || res.type === "default")) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    })(),
  );
});
