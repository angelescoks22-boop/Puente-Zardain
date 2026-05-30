const CACHE_NAME = 'zardain-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API, sockets y dominios externos: solo red (no interceptar)
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached ?? caches.match(OFFLINE_URL) ?? Response.error();
        }),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return res;
        });
      }),
    );
  }
});
