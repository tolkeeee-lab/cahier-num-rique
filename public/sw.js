/* Service Worker PWA Robust Offline Shell — Cahier Numérique */

const CACHE_NAME = 'cahier-pwa-v2'
const STATIC_ASSETS = [
  '/',
  '/journal',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icon.svg',
]

// Installation : Pre-caching robuste asset par asset avec Promise.allSettled
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Pre-caching static assets...')
      await Promise.allSettled(
        STATIC_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' })
            if (response.ok) {
              await cache.put(url, response)
              console.log('[SW] Cached asset:', url)
            }
          } catch (err) {
            console.warn('[SW] Could not pre-cache asset:', url, err)
          }
        })
      )
    })
  )
  self.skipWaiting()
})

// Activation : Nettoyage immédiat des anciens caches + prise en charge des clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key)
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // 1. Ignorer les API dynamiques et requêtes non-GET (gérées côté client avec IndexedDB)
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return
  }

  // 2. Navigation HTML (pages web, reload PWA) -> Network First avec Fallback Cache robuste
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
          }
          return response
        })
        .catch(async () => {
          console.log('[SW] Network failed, serving HTML shell from cache for:', event.request.url)
          const cachedExact = await caches.match(event.request)
          if (cachedExact) return cachedExact

          // Secours universel : retourner la page /journal ou / depuis le cache
          const cachedJournal = await caches.match('/journal')
          if (cachedJournal) return cachedJournal

          const cachedHome = await caches.match('/')
          if (cachedHome) return cachedHome

          // Dernier recours : chercher n'importe quel HTML dans le cache
          const cache = await caches.open(CACHE_NAME)
          const keys = await cache.keys()
          for (const key of keys) {
            if (key.url.includes('/journal') || key.url.endsWith('/')) {
              const res = await cache.match(key)
              if (res) return res
            }
          }

          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cahier Numérique</title></head><body style="background:#141210;color:#fff;font-family:sans-serif;text-align:center;padding:50px;"><h2>Cahier Numérique (Mode Hors Ligne)</h2><p>L\'application est chargée. Veuillez rafraîchir ou vous reconnecter.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        })
    )
    return
  }

  // 3. Fichiers statiques Next.js (/_next/static/, JS, CSS, images, polices)
  // Stale-While-Revalidate + Cache First pour la réactivité offline
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
          }
          return networkResponse
        })
        .catch(() => cachedResponse)

      return cachedResponse || fetchPromise
    })
  )
})
