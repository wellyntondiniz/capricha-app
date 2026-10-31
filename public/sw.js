// Service Worker leve para habilitar instalação do PWA (Add to Home Screen).
// Requisições de API (/api) sempre vão direto para a rede.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api')) return;
  event.respondWith(fetch(event.request));
});
