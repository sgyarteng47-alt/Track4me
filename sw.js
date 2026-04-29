// Track4Me Service Worker v6
// Host this file as sw.js in the same GitHub repo as index.html

const CACHE = 't4m-v6';
const EXT_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/webfonts/fa-brands-400.woff2'
];

// Install: pre-cache FontAwesome assets
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(EXT_ASSETS).catch(() => {})
    )
  );
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: smart cache strategy
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // FontAwesome: cache-first
  if (url.includes('cloudflare')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp && resp.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
          }
          return resp;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // App HTML (GitHub Pages): network-first, fall back to cache
  if (url.includes('github.io') || url.endsWith('index.html') || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() =>
        caches.match(e.request).then(cached =>
          cached || new Response('Offline - open app once with internet to enable offline mode.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          })
        )
      )
    );
    return;
  }

  // Everything else: try network, fall back to cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
