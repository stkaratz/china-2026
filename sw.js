const CACHE = 'china2026-202611271141';
const TILES = 'c26-tiles-v1'; // saved map tiles: kept across app updates
const CORE = ['./', './apple-touch-icon.png', './manifest.webmanifest', './vendor/leaflet.js', './vendor/leaflet.markercluster.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('china2026-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('.is.autonavi.com') && url.pathname === '/appmaptile') { e.respondWith(tile(url)); return; }
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.json') || url.pathname.includes('/classic/')) return;
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    e.respondWith(networkFirst(url));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
// Map tiles: the saved copy first (every tile server counts as the same tile), then the network, keeping what it fetches.
function tile(url) {
  const q = url.searchParams, key = 'https://tiles.china2026/' + q.get('z') + '/' + q.get('x') + '/' + q.get('y');
  return caches.open(TILES).then(c => c.match(key).then(hit => hit || fetch(url.href, { mode: 'cors' }).then(res => {
    if (res.ok) c.put(key, res.clone());
    return res;
  })));
}
function networkFirst(url) {
  const page = new URL('./', self.registration.scope).href;
  const net = fetch(url.href, { cache: 'no-store' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(page, copy)); }
    return res;
  });
  const wait = new Promise(resolve => setTimeout(resolve, 4000));
  return Promise.race([net.catch(() => null), wait])
    .then(res => res || caches.match(page).then(hit => hit || net));
}
