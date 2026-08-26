const CACHE_NAME = 'noteroo-cache-v2'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json'
]

// Install event - Cache static shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Failed to cache static assets during install', err)
      })
    })
  )
})

// Activate event - Clean up old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - Network-first strategy for all navigation and assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html')
          }
        })
      })
  )
})
