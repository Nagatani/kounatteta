// オフライン対応＆更新管理用 Service Worker（Network-First 戦略）
// アプリを更新したいときは APP_VERSION を上げるだけでクライアントに更新が通知されます。
const APP_VERSION = '1.2.0';
const CACHE_NAME = 'kounatteta-cache-v' + APP_VERSION;
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=' + APP_VERSION,
  './manifest.json?v=' + APP_VERSION,
  './icons/icon.svg?v=' + APP_VERSION,
  './js/templates.js?v=' + APP_VERSION,
  './js/custom.js?v=' + APP_VERSION,
  './js/renderer.js?v=' + APP_VERSION,
  './js/rig-editor.js?v=' + APP_VERSION,
  './js/app.js?v=' + APP_VERSION
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // 初回インストール時は即座に有効化（更新時はクライアントからの SKIP_WAITING で適用）
  if (!self.registration.active) {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
