/* Service Worker PWA Unifié — Cahier Numérique
 * - Versionné automatiquement via ?v=<NEXT_PUBLIC_BUILD_ID> (plus besoin d'incrémenter manuellement)
 * - Ne met JAMAIS en cache les requêtes API, authentifiées ou RSC Next.js
 * - Pages HTML en Network-First strict (cache: 'no-store', timeout 4s) avec repli hors-ligne instantané
 * - Cache-First réservé uniquement aux fichiers immuables avec hash (/_next/static/, icônes, logos)
 */

const SW_VERSION = (() => {
  try {
    return new URL(self.location.href).searchParams.get('v') || 'v47'
  } catch {
    return 'v47'
  }
})()

const CACHE_PREFIX = 'cahier-pwa-'
const CACHE_NAME = `${CACHE_PREFIX}${SW_VERSION}`

const STATIC_ASSETS = [
  '/',
  '/journal',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icons/pwa-192.png',
  '/icons/pwa-512.png',
  '/icons/pwa-maskable-192.png',
  '/icons/pwa-maskable-512.png',
  '/icons/pwa-apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/icons/favicon-48.png',
  '/icons/icon-any.svg',
  '/logo/logo-horizontal.svg',
  '/logo/logo-symbole.svg',
]

// Installation : pré-cache les pages clés et icônes avec cache: 'no-store' pour garantir le mode hors-ligne dès l'installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-store' })
            if (response.ok) {
              await cache.put(url, response)
            }
          } catch {
            // Ignorer en cas d'installation hors-ligne
          }
        })
      )
    })
  )
  self.skipWaiting()
})

// Activation : purge immédiate de tous les anciens caches + prise de contrôle des clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
          return undefined
        })
      )
    )
  )
  self.clients.claim()
})

// Messages du client (mise à jour forcée ou purge complète du cache)
self.addEventListener('message', (event) => {
  if (!event.data) return
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    )
  }
})

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return
  }

  const url = new URL(event.request.url)

  // 1. Ne JAMAIS intercepter ni mettre en cache :
  // - requêtes cross-origin (Supabase, polices externes, etc.)
  // - requêtes non-GET ou authentifiées
  // - routes /api/* et /sw.js
  // - payloads Next.js App Router RSC (?_rsc= ou header RSC) -> évite le blocage entre deux versions
  if (
    url.origin !== self.location.origin ||
    event.request.method !== 'GET' ||
    event.request.headers.has('authorization') ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/sw.js' ||
    url.searchParams.has('_rsc') ||
    event.request.headers.get('rsc') === '1' ||
    event.request.headers.get('next-router-prefetch') === '1'
  ) {
    return
  }

  // 2. Navigation HTML (pages web, lancement PWA) -> Network-First strict (cache: 'no-store', timeout 4s)
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 4000)

          const response = await fetch(event.request, {
            cache: 'no-store',
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

          if (response && response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
            return response
          }
        } catch {
          // Hors-ligne ou réseau trop lent : bascule sur le cache local
        }

        const cachedExact = await caches.match(event.request)
        if (cachedExact) return cachedExact

        const cachedJournal = await caches.match('/journal')
        if (cachedJournal) return cachedJournal

        const cachedHome = await caches.match('/')
        if (cachedHome) return cachedHome

        return new Response(
          '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cahier Numérique</title></head><body style="background:#f5efe0;color:#1c1917;font-family:system-ui,sans-serif;text-align:center;padding:48px 24px;"><h2>Cahier Numérique — Mode hors-ligne</h2><p style="color:#57534e;max-width:360px;margin:12px auto;">Connexion indisponible pour le premier chargement. Reconnectez-vous puis actualisez la page.</p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      })()
    )
    return
  }

  // 3. Assets immuables avec hash (/_next/static/, icônes, logos) -> Cache-First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/logo/')
  ) {
    event.respondWith(
      caches.match(event.request).then(async (cachedResponse) => {
        if (cachedResponse) return cachedResponse
        try {
          const networkResponse = await fetch(event.request)
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return networkResponse
        } catch {
          return new Response('', { status: 408, statusText: 'Offline' })
        }
      })
    )
    return
  }

  // 4. Autres ressources même origine (manifest, etc.) -> Network-First avec fallback cache
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        return cached || new Response('', { status: 408, statusText: 'Offline' })
      })
  )
})
