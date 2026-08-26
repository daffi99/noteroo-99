const CACHE_NAME = 'noteroo-pwa-v3'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)))
    }).then(() => self.clients.claim())
  )
})

// Passthrough fetch - let browser load fresh assets from CDN with zero cache corruption
self.addEventListener('fetch', () => {
  return
})
