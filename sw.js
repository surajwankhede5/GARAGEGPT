// ================================================
// GarageGPT — Service Worker v3.0
// PWABuilder + Play Store Compatible
// ================================================

const CACHE_NAME = 'garagegpt-v3';
const OFFLINE_URL = '/GARAGEGPT/';

const PRECACHE = [
  '/GARAGEGPT/',
  '/GARAGEGPT/index.html',
  '/GARAGEGPT/manifest.json'
];

// INSTALL
self.addEventListener('install', event => {
  console.log('[SW] Installing GarageGPT SW v3');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .catch(err => console.warn('[SW] Precache failed:', err))
  );
});

// ACTIVATE
self.addEventListener('activate', event => {
  console.log('[SW] Activating GarageGPT SW v3');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH — Network first, cache fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip external APIs
  const skipHosts = ['supabase.co','cloudinary.com','wa.me','api.anthropic.com','fonts.googleapis.com','fonts.gstatic.com'];
  if (skipHosts.some(h => url.hostname.includes(h))) return;

  // Navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Other requests — cache first
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(res => {
            if (res && res.status === 200 && res.type !== 'opaque') {
              const clone = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
            }
            return res;
          })
          .catch(() => null);
      })
  );
});

// PUSH NOTIFICATIONS
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'GarageGPT reminder',
    icon: '/GARAGEGPT/icon-192.png',
    badge: '/GARAGEGPT/icon-72.png',
    vibrate: [200, 100, 200],
    tag: 'garagegpt',
    data: { url: data.url || '/GARAGEGPT/' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'GarageGPT', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const url = event.notification.data?.url || '/GARAGEGPT/';
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// BACKGROUND SYNC
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync triggered');
  }
});
