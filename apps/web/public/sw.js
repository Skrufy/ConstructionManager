// Service Worker for Construction Management Platform
// Handles offline caching and background sync

const CACHE_NAME = 'construction-pro-v2'
const OFFLINE_URL = '/offline'

// Fallback HTML when offline page isn't cached
const FALLBACK_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - ConstructionPro</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; padding: 2rem; }
    h1 { color: #333; margin-bottom: 1rem; }
    p { color: #666; margin-bottom: 2rem; }
    button { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; }
    button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>You're Offline</h1>
    <p>Please check your internet connection and try again.</p>
    <button onclick="location.reload()">Retry</button>
  </div>
</body>
</html>`

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/projects',
  '/daily-logs',
  '/time-tracking',
  '/offline',
  '/manifest.json',
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/projects',
  '/api/users',
  '/api/labels',
]

// Pages to exclude from caching (have complex client state that can become stale)
const NO_CACHE_PAGES = [
  '/drawings',
  '/documents',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
    }).catch(err => {
      console.error('[SW] Failed to cache:', err)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  // Handle API requests with network-first strategy
  if (event.request.url.includes('/api/')) {
    // Skip caching for drawings/documents APIs - they have complex state
    const url = new URL(event.request.url)
    if (url.pathname.includes('/api/drawings') || url.pathname.includes('/api/documents')) {
      event.respondWith(fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          error: 'Offline',
          message: 'You are offline and this data is not cached.',
          offline: true
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      }))
      return
    }
    event.respondWith(networkFirstStrategy(event.request))
    return
  }

  // Handle page navigation with network-first strategy
  if (event.request.mode === 'navigate') {
    const url = new URL(event.request.url)
    const shouldSkipCache = NO_CACHE_PAGES.some(page => url.pathname.startsWith(page))

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Skip caching for pages with complex client state
          if (shouldSkipCache) {
            return response
          }
          // Cache successful page responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch(async () => {
          // Don't serve cached versions of dynamic pages - they may have stale state
          if (shouldSkipCache) {
            const offlinePage = await caches.match(OFFLINE_URL)
            if (offlinePage) return offlinePage

            return new Response(FALLBACK_HTML, {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html' }
            })
          }

          // Serve from cache when offline
          const cachedResponse = await caches.match(event.request)
          if (cachedResponse) return cachedResponse

          const offlinePage = await caches.match(OFFLINE_URL)
          if (offlinePage) return offlinePage

          // Fallback to inline HTML when offline page isn't cached
          return new Response(FALLBACK_HTML, {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html' }
          })
        })
    )
    return
  }

  // Handle static assets with cache-first strategy
  event.respondWith(cacheFirstStrategy(event.request))
})

// Network-first strategy for API requests
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request)

    // Cache successful API responses
    if (response.status === 200) {
      const responseClone = response.clone()
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, responseClone)
    }

    return response
  } catch (error) {
    // Fall back to cache when offline
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Return error response if no cache available
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'You are offline and this data is not cached.',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const response = await fetch(request)

    // Cache successful responses
    if (response.status === 200) {
      const responseClone = response.clone()
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, responseClone)
    }

    return response
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_URL)
      if (offlinePage) return offlinePage

      // Fallback to inline HTML when offline page isn't cached
      return new Response(FALLBACK_HTML, {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Return a proper error response for non-navigation requests
    return new Response('Network error', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

// Background sync for queued actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)

  if (event.tag === 'sync-daily-logs') {
    event.waitUntil(syncDailyLogs())
  }

  if (event.tag === 'sync-time-entries') {
    event.waitUntil(syncTimeEntries())
  }
})

// Sync queued daily logs
async function syncDailyLogs() {
  const db = await openDB()
  const tx = db.transaction('pendingDailyLogs', 'readonly')
  const store = tx.objectStore('pendingDailyLogs')
  const pendingLogs = await store.getAll()

  for (const log of pendingLogs) {
    try {
      const response = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log.data)
      })

      if (response.ok) {
        // Remove from pending queue (properly await the IDBRequest)
        const deleteTx = db.transaction('pendingDailyLogs', 'readwrite')
        await wrapRequest(deleteTx.objectStore('pendingDailyLogs').delete(log.id))

        // Notify clients
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_COMPLETE',
              payload: { type: 'daily-log', id: log.id }
            })
          })
        })
      }
    } catch (error) {
      console.error('[SW] Failed to sync daily log:', error)
    }
  }
}

// Sync queued time entries
async function syncTimeEntries() {
  const db = await openDB()
  const tx = db.transaction('pendingTimeEntries', 'readonly')
  const store = tx.objectStore('pendingTimeEntries')
  const pendingEntries = await store.getAll()

  for (const entry of pendingEntries) {
    try {
      const response = await fetch('/api/time-entries', {
        method: entry.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.data)
      })

      if (response.ok) {
        // Remove from pending queue (properly await the IDBRequest)
        const deleteTx = db.transaction('pendingTimeEntries', 'readwrite')
        await wrapRequest(deleteTx.objectStore('pendingTimeEntries').delete(entry.id))

        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_COMPLETE',
              payload: { type: 'time-entry', id: entry.id }
            })
          })
        })
      }
    } catch (error) {
      console.error('[SW] Failed to sync time entry:', error)
    }
  }
}

// Simple IndexedDB wrapper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ConstructionProOffline', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Create object stores for offline data
      if (!db.objectStoreNames.contains('pendingDailyLogs')) {
        db.createObjectStore('pendingDailyLogs', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('pendingTimeEntries')) {
        db.createObjectStore('pendingTimeEntries', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('cachedProjects')) {
        db.createObjectStore('cachedProjects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('cachedLabels')) {
        db.createObjectStore('cachedLabels', { keyPath: 'id' })
      }
    }
  })
}

// Helper to wrap IDBRequest in a Promise
function wrapRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Message handler for client communication
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data.type === 'CACHE_URLS') {
    caches.open(CACHE_NAME).then(cache => {
      cache.addAll(event.data.urls)
    })
  }
})
