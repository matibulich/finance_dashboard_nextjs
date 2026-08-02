const CACHE_NAME = "finance-dashboard-v1";

self.addEventListener("install", (event) => {
  console.log("Service Worker instalado");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activado");
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Por ahora no cacheamos nada.
});