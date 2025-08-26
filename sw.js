/**
 * DevFlow Service Worker v1.0.0
 * Provides offline functionality and caching
 */

const CACHE_NAME = 'devflow-v1.0.0';
const STATIC_CACHE = 'devflow-static-v1';
const DYNAMIC_CACHE = 'devflow-dynamic-v1';
const API_CACHE = 'devflow-api-v1';

const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/main.css',
  '/assets/js/real-data.js',
  '/assets/js/database.js', 
  '/assets/js/auth.js',
  '/assets/js/app.js',
  '/assets/images/favicon.svg',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
  'https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js'
];

const API_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Install event
self.addEventListener('install', event => {
  console.log('🔧 DevFlow Service Worker installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Caching static files');
        return cache.addAll(STATIC_FILES.map(url => new Request(url, { credentials: 'same-origin' })));
      })
      .then(() => {
        console.log('✅ Static files cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Failed to cache static files:', error);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('🚀 DevFlow Service Worker activating...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(cacheName)) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle different types of requests
  if (url.origin === self.location.origin) {
    // Same origin requests - use cache first strategy
    event.respondWith(cacheFirstStrategy(request));
  } else if (url.hostname === 'api.github.com') {
    // GitHub API requests - use network first with cache fallback
    event.respondWith(networkFirstWithCache(request));
  } else if (url.hostname === 'cdn.jsdelivr.net') {
    // CDN requests - use cache first
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Other external requests - use network first
    event.respondWith(networkFirstStrategy(request));
  }
});

/**
 * Cache first strategy - try cache first, then network
 */
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Update cache in background if it's been a while
      updateCacheInBackground(request);
      return cachedResponse;
    }

    // Not in cache, fetch from network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Add to appropriate cache
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    return createOfflineResponse(request);
  }
}

/**
 * Network first strategy with API caching
 */
async function networkFirstWithCache(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache API responses with timestamp
      const cache = await caches.open(API_CACHE);
      const responseToCache = networkResponse.clone();

      // Add cache timestamp header
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-date', Date.now().toString());

      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });

      cache.put(request, modifiedResponse);
    }

    return networkResponse;
  } catch (error) {
    console.log('Network failed for GitHub API, trying cache:', request.url);

    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Check if cache is still valid
      const cacheDate = cachedResponse.headers.get('sw-cache-date');
      if (cacheDate && Date.now() - parseInt(cacheDate) > API_CACHE_DURATION) {
        console.log('Cached API response expired');
        return createOfflineResponse(request);
      }

      // Add offline indicator header
      const headers = new Headers(cachedResponse.headers);
      headers.set('sw-offline-cache', 'true');

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }

    return createOfflineResponse(request);
  }
}

/**
 * Network first strategy - try network first, then cache
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || createOfflineResponse(request);
  }
}

/**
 * Update cache in background
 */
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silent fail for background updates
    console.log('Background cache update failed:', error.message);
  }
}

/**
 * Create offline response
 */
function createOfflineResponse(request) {
  const url = new URL(request.url);

  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    return new Response(
      createOfflineHTML(),
      {
        headers: { 'Content-Type': 'text/html' },
        status: 200
      }
    );
  }

  if (url.hostname === 'api.github.com') {
    return new Response(
      JSON.stringify({
        message: 'You are currently offline. Please check your internet connection.',
        offline: true,
        cached_data_available: false
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 503
      }
    );
  }

  return new Response(
    'This content is not available offline.',
    {
      status: 503,
      statusText: 'Service Unavailable'
    }
  );
}

/**
 * Create offline HTML page
 */
function createOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DevFlow - Offline</title>
        <style>
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background: linear-gradient(135deg, #2D3748 0%, #1a202c 50%, #7D8471 100%);
                color: #F7F3E9;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                text-align: center;
                padding: 20px;
            }
            .offline-container {
                max-width: 500px;
                padding: 3rem;
                background: rgba(125, 132, 113, 0.15);
                backdrop-filter: blur(25px);
                border-radius: 24px;
                border: 1px solid rgba(192, 197, 206, 0.25);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
            }
            .offline-icon {
                font-size: 5rem;
                margin-bottom: 2rem;
                animation: pulse 2s ease-in-out infinite;
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            .offline-title {
                font-size: 2rem;
                font-weight: 800;
                margin-bottom: 1rem;
                background: linear-gradient(135deg, #00DDFF, #64FFDA);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .offline-message {
                margin-bottom: 2rem;
                line-height: 1.6;
                font-size: 1.1rem;
                color: #C0C5CE;
            }
            .retry-button {
                background: linear-gradient(135deg, #00DDFF, #64FFDA);
                color: #2D3748;
                border: none;
                padding: 1rem 2rem;
                border-radius: 12px;
                font-weight: 700;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .retry-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(0, 221, 255, 0.3);
            }
            .features-list {
                margin-top: 2rem;
                text-align: left;
                color: #C0C5CE;
                font-size: 0.9rem;
            }
            .features-list h4 {
                color: #00DDFF;
                margin-bottom: 1rem;
                text-align: center;
            }
            .features-list ul {
                list-style: none;
                padding: 0;
            }
            .features-list li {
                margin-bottom: 0.5rem;
                padding-left: 1.5rem;
                position: relative;
            }
            .features-list li::before {
                content: '✓';
                color: #64FFDA;
                font-weight: bold;
                position: absolute;
                left: 0;
            }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <div class="offline-icon">📡</div>
            <h1 class="offline-title">You're Offline</h1>
            <p class="offline-message">
                DevFlow needs an internet connection to fetch the latest GitHub data and provide real-time insights. 
                Please check your connection and try again.
            </p>
            <button class="retry-button" onclick="window.location.reload()">
                Try Again
            </button>

            <div class="features-list">
                <h4>Available Offline Features:</h4>
                <ul>
                    <li>Browse cached repository data</li>
                    <li>View your contribution history</li>
                    <li>Access saved bookmarks</li>
                    <li>Use basic dashboard functionality</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Handle background sync
self.addEventListener('sync', event => {
  if (event.tag === 'github-data-sync') {
    console.log('🔄 Background sync: github-data-sync');
    event.waitUntil(syncGitHubData());
  }
});

/**
 * Sync GitHub data in background
 */
async function syncGitHubData() {
  try {
    console.log('🔄 Syncing GitHub data in background...');

    // Get stored auth token
    const registration = await self.registration;
    const clients = await registration.matchAll();

    if (clients.length > 0) {
      // Notify clients that sync is happening
      clients[0].postMessage({
        type: 'BACKGROUND_SYNC_START',
        data: { syncType: 'github-data' }
      });
    }

    console.log('✅ Background sync completed');
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body || 'New activity in your DevFlow dashboard',
      icon: '/assets/images/icon-192x192.png',
      badge: '/assets/images/favicon.svg',
      image: data.image,
      vibrate: [200, 100, 200, 100, 200],
      data: {
        url: data.url || '/',
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/assets/images/icon-192x192.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/assets/images/icon-192x192.png'
        }
      ],
      tag: data.tag || 'devflow-notification',
      renotify: true,
      requireInteraction: true
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'DevFlow Notification', 
        options
      )
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'dismiss') {
    return;
  }

  const urlToOpen = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: { url: urlToOpen, action: action }
            });
            return;
          }
        }

        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Cache size management
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then(size => {
      event.ports[0].postMessage({ cacheSize: size });
    });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearOldCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

/**
 * Get total cache size
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

/**
 * Clear old caches
 */
async function clearOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];

  return Promise.all(
    cacheNames.map(cacheName => {
      if (!currentCaches.includes(cacheName)) {
        console.log('🗑️ Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

console.log('🚀 DevFlow Service Worker v1.0.0 loaded');
