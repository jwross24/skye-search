// SkyeSearch Service Worker
// Offline fallback + Web Push notification handler

const CACHE_NAME = 'skye-v1'
const OFFLINE_URL = '/offline'

// Pre-cache the offline fallback page on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  )
  self.skipWaiting()
})

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Network-first with offline fallback for navigation requests
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL)
      // If the offline page wasn't cached (e.g. install failed), return a minimal
      // inline response so the browser doesn't show a generic error screen.
      if (cached) return cached
      return new Response(
        '<html><body><h1>You are offline</h1><p>Check your connection and try again.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      )
    })
  )
})

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/immigration' },
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Open app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.visibilityState === 'visible')
      if (existing) {
        existing.navigate(event.notification.data.url)
        return existing.focus()
      }
      return self.clients.openWindow(event.notification.data.url)
    })
  )
})
