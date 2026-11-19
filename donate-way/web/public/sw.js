// Sanad service worker: fast repeat visits. Static assets cache-first; public read-only API and pages
// network-first with a cached fallback (so the shell opens on a flaky connection). Nothing signed-in is cached.
const VERSION = "sanad-v1";
const PUBLIC_API = ["/api/campaigns", "/api/stats", "/api/prices", "/api/challenges", "/api/leaderboard", "/api/transparency"];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has("authorization")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon") {
    e.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }
  if (PUBLIC_API.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"))) {
    e.respondWith(networkFirst(req));
    return;
  }
  if (req.mode === "navigate" && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/admin")) {
    e.respondWith(networkFirst(req));
  }
});
