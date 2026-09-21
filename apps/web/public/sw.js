/**
 * Offline service worker.
 *
 * The whole point of this app is that it keeps working with no signal, so the
 * shell is cached on install and served cache-first. There is nothing to
 * revalidate against a server at runtime: every calculation happens on the
 * device, so a stale cache is a fully working app, not a degraded one.
 */
const CACHE = 'kundali-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // tier1 is 82 KB gzipped and is what makes place search work with no
      // signal, so it is part of the shell rather than a later fetch.
      .then((cache) => cache.addAll([
        '/', '/index.html', '/manifest.webmanifest',
        '/places/tier1.txt', '/places/index.json',
      ]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request)
        .then((response) => {
          // Hashed build assets are immutable, so caching them is always safe.
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        // A navigation with no network falls back to the cached shell.
        .catch(() => (request.mode === 'navigate' ? caches.match('/index.html') : undefined));
    }),
  );
});
