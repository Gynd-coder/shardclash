// Shard Clash service worker: primero internet, y si no hay conexión usa la copia guardada
const CACHE = "shardclash-v31";
const ASSETS = ["./", "index.html", "manifest.webmanifest", "icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range") || /\.(mp3|ogg|wav|m4a)$/i.test(new URL(req.url).pathname)) return; // audio: siempre directo
  e.respondWith(fetch(req).then(res => {
    if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }  // nunca guarda errores
    return res;
  }).catch(() => caches.match(req).then(hit => hit || caches.match("index.html"))));
});
