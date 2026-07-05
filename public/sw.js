const CACHE_NAME = 'masoudi-cache-v1';
const urlsToCache = [
  'index.html',
  'style.css',
  'app.js',
  'images/app_icon.png',
  'images/player_avatar.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
