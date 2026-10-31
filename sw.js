// Avval tarmoq, bo'lmasa kesh: yangilanishlar odamlarga darrov yetib boradi, internet yo'qda ham ochiladi.
const CACHE = 'qshop-v3';
const ASSETS = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;        // Supabase va CDN so'rovlariga tegmaymiz
  if (url.pathname.includes('/admin/')) return;      // admin ilovaning o'z keshi bor
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});

// ---- Xabarnomalar (push) ----
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'qatti.SHOP', {
    body: d.body || '', icon: 'icon-192.png', badge: 'badge-96.png', vibrate: [200, 100, 200, 100, 200], tag: 'q' + Date.now(), renotify: true, requireInteraction: false, silent: false, data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  const go = (new URL(url, self.registration.scope)).searchParams.get('go');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const w = list.find(c => c.url.startsWith(self.registration.scope));
    if (w) { if (go) w.postMessage({ go }); return w.focus(); }
    return self.clients.openWindow(new URL(url, self.registration.scope).href);
  }));
});
