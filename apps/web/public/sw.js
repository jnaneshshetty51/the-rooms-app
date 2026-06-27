// Service Worker for The Rooms PWA
// Provides offline support with cache-first strategy

const CACHE_NAME = 'the-rooms-v2';
const OFFLINE_URL = '/offline';

const PRECACHE_ASSETS = [
  '/offline',
];

// Install event - precache minimal set
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests from the same origin
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== location.origin) return;

  // Skip API routes, Next.js internals, and auth routes
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/_vercel/') ||
    url.pathname.startsWith('/auth/')
  ) return;

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else if (isPageRequest(request)) {
    event.respondWith(networkFirst(request));
  }
  // Everything else: let the browser handle it natively (no SW intercept)
});

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|webp|svg|ico|woff|woff2|ttf|eot)$/.test(pathname);
}

function isPageRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

// Cache-first: serve from cache, fill from network
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match(OFFLINE_URL);
  }
}

// Network-first: try network, fall back to cache then offline page
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match(OFFLINE_URL);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'The Rooms', {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow?.(url);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
