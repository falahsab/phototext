const CACHE_NAME = 'pro-ocr-cache-v2';
const SHARED_CACHE_NAME = 'pro-ocr-shared-data';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== SHARED_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Handle Web Share Target for incoming shared images (e.g. from WhatsApp, Gallery, etc.)
  if (event.request.method === 'POST') {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const sharedFile = formData.get('shared_image');
        if (sharedFile) {
          const cache = await caches.open(SHARED_CACHE_NAME);
          await cache.put('shared-image-transfer', new Response(sharedFile, {
            headers: {
              'content-type': sharedFile.type || 'image/jpeg',
              'x-shared-timestamp': Date.now().toString()
            }
          }));
        }
      } catch (err) {
        console.error('Error in Service Worker share target:', err);
      }
      return Response.redirect('./index.html?shared=1', 303);
    })());
    return;
  }

  // Stale-while-revalidate strategy for GET requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* Offline fallback */});
        return cachedResponse;
      }

      return fetch(event.request);
    })
  );
});
