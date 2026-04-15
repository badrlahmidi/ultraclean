/**
 * UltraClean Service Worker — PWA offline support
 *
 * Strategy:
 *  - Shell (app.blade.php rendered HTML): Network-first with stale-while-revalidate fallback
 *  - Static assets (JS/CSS/fonts/images): Cache-first with background update
 *  - API/POST requests: Network-only (never cache mutations)
 *  - Offline fallback: /offline page served from cache when network is unavailable
 *
 * Cache names are versioned so old entries are cleaned up on SW activation.
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE   = `ultraclean-shell-${CACHE_VERSION}`;
const ASSET_CACHE   = `ultraclean-assets-${CACHE_VERSION}`;
const ALL_CACHES    = [SHELL_CACHE, ASSET_CACHE];

// Pre-cache the offline fallback page on install
const OFFLINE_URL = '/offline';

// Static asset URL patterns to cache aggressively
const ASSET_PATTERNS = [
    /\/build\/assets\//,
    /\/fonts\//,
    /\/icons\//,
    /\/images\//,
    /fonts\.bunny\.net/,
];

// ── Install: pre-cache the offline page ─────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then(cache => cache.addAll([OFFLINE_URL]))
    );
    // Activate immediately — don't wait for old tabs to close
    self.skipWaiting();
});

// ── Activate: delete stale caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => !ALL_CACHES.includes(key))
                    .map(key => caches.delete(key))
            )
        )
    );
    // Take control of all open clients immediately
    self.clients.claim();
});

// ── Fetch: routing strategy ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Never intercept non-GET or cross-origin requests that aren't assets
    if (request.method !== 'GET') return;

    // Static assets: cache-first
    if (ASSET_PATTERNS.some(p => p.test(request.url))) {
        event.respondWith(cacheFirst(request, ASSET_CACHE));
        return;
    }

    // Same-origin navigation (HTML pages): network-first with offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(networkFirstWithFallback(request));
        return;
    }

    // Everything else (same-origin JSON/XHR): network-only
    // (Inertia page data should never come from a stale cache)
});

// ── Strategies ───────────────────────────────────────────────────────────────

/**
 * Cache-first: return cached response instantly; update cache in background.
 * Ideal for versioned static assets that never change at the same URL.
 */
async function cacheFirst(request, cacheName) {
    const cache    = await caches.open(cacheName);
    const cached   = await cache.match(request);
    const fetchPromise = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
    }).catch(() => cached); // network failed — return stale

    return cached ?? fetchPromise;
}

/**
 * Network-first with offline fallback.
 * Tries the network; on failure returns the cached offline page.
 */
async function networkFirstWithFallback(request) {
    try {
        const response = await fetch(request);
        // Cache successful navigations for potential offline use
        if (response.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cache   = await caches.open(SHELL_CACHE);
        const cached  = await cache.match(request);
        const offline = await cache.match(OFFLINE_URL);
        return cached ?? offline;
    }
}
