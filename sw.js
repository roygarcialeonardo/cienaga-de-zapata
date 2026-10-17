/* Ciénaga de Zapata · Service Worker (PWA)
   - Cache-first: CSS, JS, imágenes, manifest (rápido y offline).
   - Network-first: HTML y posts.json (el contenido se actualiza siempre que haya conexión).
   Cambia VERSION para forzar la actualización en los teléfonos ya instalados. */
const VERSION = 'cz-v2';
const CACHE = 'cienaga-' + VERSION;

const CORE = [
  './',
  'index.html',
  'estilos.css',
  'sitio.js',
  'qrcode.min.js',
  'mapas.js',
  'cuba.js',
  'provincias.json',
  'lugares.json',
  'manifest.json',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/hero-humedal.webp'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

function esContenidoFresco(url) {
  const p = new URL(url).pathname;
  return p.endsWith('.html') || p.endsWith('/') || p.endsWith('posts.json');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return; // no tocar Google Fonts ni terceros

  if (esContenidoFresco(req.url)) {
    // Network-first con respaldo a caché: contenido siempre actualizado si hay conexión
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  // Cache-first para CSS, JS, imágenes y manifest
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      });
    })
  );
});
