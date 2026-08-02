// ZimScope service worker — caches the static app shell so the interface
// (not live Firestore data) still loads without a connection.

const CACHE_NAME = "zimscope-shell-v1";
const SHELL_FILES = [
  "index.html",
  "admin.html",
  "app.js",
  "admin.js",
  "ai-tutor.js",
  "firebase-config.js",
  "manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  // Only handle same-origin GET requests for the app shell.
  // Firestore/Auth/API calls go straight to the network as normal.
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
