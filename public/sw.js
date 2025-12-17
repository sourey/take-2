const CACHE_NAME = 'take2-v1';

// Assets to cache for offline use
const ASSETS_TO_CACHE = [
  '/',
  '/card-back.png',
  // Card images will be cached dynamically
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
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

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests except for card images
  if (url.origin !== location.origin && !url.href.includes('deckofcardsapi.com')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Don't cache non-successful responses
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Clone the response since it can only be consumed once
        const responseToCache = networkResponse.clone();

        // Cache the fetched resource
        caches.open(CACHE_NAME).then((cache) => {
          // Cache card images and static assets
          if (
            url.href.includes('deckofcardsapi.com') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.jpg') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.css') ||
            url.pathname === '/'
          ) {
            cache.put(request, responseToCache);
          }
        });

        return networkResponse;
      }).catch(() => {
        // Return cached version if network fails
        return caches.match(request);
      });
    })
  );
});


