/* Сервис-воркер: приложение открывается мгновенно и работает без сети.
   Стратегия: HTML — сеть с откатом в кэш, остальное — кэш с фоновым обновлением. */
const CACHE = 'otp-crm-v4';
const CORE = ['./', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); return r; }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then((cached) => {
    const net = fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; }).catch(() => cached);
    return cached || net;
  }));
});

/* Уведомления. В превью сюда приходит только проверочное — его показывает сама
   страница через registration.showNotification. Обработчик push оставлен рабочим:
   когда в CRM появятся ключи VAPID и отправка с сервера, менять здесь нечего. */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'On Top Property', {
    body: d.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: d.tag || 'otp',
    data: { url: d.url || './' },
  }));
});

/* Тап по уведомлению: если CRM уже открыта — переводим её на нужный экран,
   иначе открываем новое окно. Без этого iOS просто поднимает приложение на том
   месте, где его бросили, и человек ищет, о чём было уведомление. */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === self.location.origin) { await c.focus(); return c.navigate ? c.navigate(url) : undefined; }
    }
    return self.clients.openWindow(url);
  })());
});
