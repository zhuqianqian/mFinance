/* 掌上资产 Service Worker —— app shell 预缓存，离线可用 */
const CACHE = 'mfinance-v6';
const IMG_CACHE = 'mfinance-img-v1';
const SHELL = [
  './',
  './index.html',
  './css/app.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/util.js',
  './js/store.js',
  './js/icons.js',
  './js/models.js',
  './js/loan.js',
  './js/valuation.js',
  './js/charts.js',
  './js/views/home.js',
  './js/views/accounts.js',
  './js/views/account-form.js',
  './js/views/account-detail.js',
  './js/views/reconcile.js',
  './js/views/settings.js',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== IMG_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 跨域：机构官方图标 -> 运行时缓存（首次联网后离线也能显示）；其余跨域（行情接口）走网络
  if (url.origin !== self.location.origin) {
    if (req.destination === 'image') {
      e.respondWith(
        caches.open(IMG_CACHE).then(async (c) => {
          const hit = await c.match(req);
          if (hit) return hit;
          try { const res = await fetch(req); if (res && res.status === 200) c.put(req, res.clone()); return res; }
          catch (_) { return hit || Response.error(); }
        })
      );
    }
    return;
  }

  // 同源：cache-first，回退网络并写缓存
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
