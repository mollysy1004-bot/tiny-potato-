/* Tiny Potato 离线缓存：同源资源 cache-first，页面请求 network-first 兜底到缓存。 */
const CACHE = 'tiny-potato-v2'

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    // 页面本身永远先走网络，且绕开浏览器 HTTP 缓存，
    // 否则发了新版本用户还会拿到旧的 index.html（引用的还是旧的 js/css）
    e.respondWith(
      fetch(req.url, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
          return res
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))),
    )
    return
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
