const CACHE_NAME = 'sgi-cache-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/estado.html',
  '/operario.html',
  '/dashboard.html',
  '/css/main.css',
  '/js/supabase-config.js',
  '/images/favicon.png'
];

// Instalación: Cachear activos estáticos
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activación: Limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Estrategia: Network First con fallback a Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
