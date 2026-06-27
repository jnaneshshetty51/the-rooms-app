// apps/front-office/public/sw.js
// Service Worker for Front Office PWA - Offline support

const CACHE_NAME = 'fo-cache-v2';
const OFFLINE_URL = '/offline';

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/rooms/board',
  '/bookings',
  '/offline',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests (they should fail gracefully)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/offline');
      })
    );
    return;
  }

  // For navigation requests, try network first
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          // Cache successful responses - clone BEFORE returning to avoid "Response body already used"
          if (response.ok) {
            const responseClone = response.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, responseClone);
          }
          return response;
        } catch {
          // Fallback to cache or offline page
          const cached = await caches.match(request);
          return cached || (await caches.match(OFFLINE_URL));
        }
      })()
    );
    return;
  }

  // For other requests, try cache first then network
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        // Cache successful responses for static assets - clone BEFORE returning
        if (response.ok && (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/icons/'))) {
          const responseClone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, responseClone);
        }
        return response;
      } catch {
        // Return offline fallback for images
        if (request.destination === 'image') {
          return await caches.match('/icons/icon-192x192.png');
        }
        throw new Error('Network error');
      }
    })()
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});