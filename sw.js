const CACHE_NAME = 'pro-ocr-cache-v3';
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
  const url = new URL(event.request.url);

  // CRITICAL: Handle Web Share Target ONLY for same-origin requests directed to the app
  // NEVER intercept external API calls like Google Gemini (generativelanguage.googleapis.com)
  if (event.request.method === 'POST') {
    const isSameOrigin = url.origin === self.location.origin;
    const isSharePath = url.pathname.endsWith('index.html') || url.pathname.endsWith('/') || url.pathname === self.location.pathname;

    if (isSameOrigin && isSharePath) {
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

    // Pass all other POST requests (such as Google Gemini API calls) directly to network
    return;
  }

  // Only cache same-origin GET requests for offline PWA operation
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Stale-while-revalidate strategy for local GET assets
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
