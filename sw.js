const CACHE_NAME = 'decigatan-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

// Bestanden cachen voor offline gebruik
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});

// Luisteren naar achtergrond-notificaties (Push of Notification API)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.openWindow('./index.html')
  );
});
