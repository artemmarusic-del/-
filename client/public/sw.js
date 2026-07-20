// Service worker для ХЕ.Дневник.
// Задачи: сделать приложение устанавливаемым, дать оболочке открываться без
// сети и доставлять обновления установленным приложениям.
// Запросы к /api НИКОГДА не кэшируются — это личные медицинские данные
// и авторизация, они всегда идут напрямую в сеть.

const CACHE = "xe-dnevnik-v2";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  // Не вызываем skipWaiting сразу: новая версия ждёт, пока приложение
  // разрешит применить её (кнопка «Обновить» или возврат на вкладку),
  // чтобы не перезагрузить страницу посреди ввода данных.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Не трогаем API и всё, что не GET: авторизация и данные — только из сети.
  if (request.method !== "GET" || url.pathname.startsWith("/api")) return;
  if (url.origin !== self.location.origin) return;

  // Переходы по страницам: сначала сеть, при её отсутствии — сохранённая оболочка.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || Response.error()))
    );
    return;
  }

  // Статика (js/css/иконки с хешем в имени): сначала кэш, потом сеть.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
    )
  );
});
