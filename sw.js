/* Service worker de Idiomas: guarda la app y el curso (son archivos fijos) para estudiar sin internet. Tu progreso vive en tu hoja de Google. */
const CACHE = "idiomas-v0.2.1";
const FILES = ["./","index.html","idiomas.css","idiomas.js","motor.js","acceso.js","config.js","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","data/cursos.json","data/plan.json","data/en/a1-u1.json","data/en/a1-u2.json","data/en/a1-u3.json","data/en/a1-u4.json","data/en/a1-u5.json","data/en/a1-u6.json","data/en/a1-u7.json","data/en/a1-u8.json","data/en/a1-u9.json","data/en/a1-u10.json","data/pt/a1-u1.json","data/pt/a1-u2.json","data/pt/a1-u3.json","data/pt/a1-u4.json","data/pt/a1-u5.json","data/pt/a1-u6.json","data/pt/a1-u7.json","data/pt/a1-u8.json","data/pt/a1-u9.json","data/pt/a1-u10.json","data/it/a1-u1.json","data/it/a1-u2.json","data/it/a1-u3.json","data/it/a1-u4.json","data/it/a1-u5.json","data/it/a1-u6.json","data/it/a1-u7.json","data/it/a1-u8.json","data/it/a1-u9.json","data/it/a1-u10.json"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
