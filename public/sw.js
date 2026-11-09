/**
 * Service Worker for Khalid Group ERP PWA (WBA)
 * Version: 3.0.0 — Mobile Native Push, App Badging, Background Sync & Periodic Sync Engine
 */

const CACHE_NAME = 'khalid-erp-pwa-v17-clean-ux-20261103';
const STATIC_ASSETS = [
  '/manifest.json',
  '/logo.png',
  '/mascot.webp',
  '/noura.webp'
];

// Install Event: Activate immediately without pre-caching HTML shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

// Activate Event: Purge ALL legacy caches (including v1, v2, v3, v4, v5) & claim all clients immediately
self.addEventListener('activate', (event) => {
  const isLocal = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (isLocal || key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()).then(() => {
      if (isLocal && self.registration) {
        self.registration.unregister().catch(() => {});
      }
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'FORCE_RELOAD_AFTER_SW_UPDATE',
            cacheVersion: CACHE_NAME,
          });
        });
      });
    })
  );
});

// Helper: Update OS App Icon Badge if supported
async function updateAppBadgeCount(count) {
  try {
    if ('setAppBadge' in self.navigator && 'clearAppBadge' in self.navigator) {
      if (typeof count === 'number' && count > 0) {
        await self.navigator.setAppBadge(count);
      } else {
        await self.navigator.clearAppBadge();
      }
    }
  } catch {
    // Ignore on platforms where Badging API is restricted
  }
}

// Fetch Event: Network-first for HTML/scripts to prevent preload mismatch, cache fallback for offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/') ||
    url.protocol.startsWith('chrome-extension') ||
    url.origin !== self.location.origin ||
    event.request.headers.get('Purpose') === 'prefetch' ||
    event.request.headers.get('Sec-Purpose') === 'prefetch'
  ) {
    return;
  }

  if (event.request.destination === 'script' || event.request.destination === 'style') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});

// Two-Way Message Channel with Main Thread (Mobile Notification Bridge & Background Sync Control)
self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (msg.type === 'UPDATE_BADGE') {
    event.waitUntil(updateAppBadgeCount(Number(msg.count || 0)));
    return;
  }

  if (msg.type === 'REGISTER_BACKGROUND_SYNC') {
    if ('sync' in self.registration) {
      event.waitUntil(
        self.registration.sync.register(msg.tag || 'alsulaim-erp-offline-sync').catch(() => {})
      );
    }
    return;
  }

  if (msg.type === 'KEEP_ALIVE_PING') {
    if (event.source && 'postMessage' in event.source) {
      event.source.postMessage({
        type: 'KEEP_ALIVE_PONG',
        timestamp: new Date().toISOString(),
        cacheVersion: CACHE_NAME
      });
    }
    return;
  }

  // Main Thread requests Native Mobile/OS Notification via ServiceWorkerRegistration.showNotification
  if (msg.type === 'SHOW_NOTIFICATION' && msg.payload) {
    const p = msg.payload;
    const title = p.title || 'مجموعة خالد السليم ERP';
    const options = {
      body: p.body || p.message || '',
      icon: p.icon || '/logo.png',
      badge: p.badge || '/logo.png',
      dir: 'rtl',
      lang: 'ar',
      tag: p.tag || p.id || `alsulaim-notif-${Date.now()}`,
      renotify: true,
      requireInteraction: Boolean(p.requireInteraction),
      vibrate: p.vibrate || [140, 60, 140],
      timestamp: Date.now(),
      data: {
        url: p.url || (p.tabKey ? `/workspace/${p.tabKey}` : '/'),
        tabKey: p.tabKey || null,
        title: p.tabTitle || p.title || '',
        notificationId: p.id || null,
        companyId: p.companyId || null
      },
      actions: [
        { action: 'open', title: p.actionLabel || 'فتح القسم الآن' },
        { action: 'mark_read', title: 'تحديد كمقروء' },
        { action: 'dismiss', title: 'إغلاق' }
      ]
    };

    if (typeof p.unreadCount === 'number') {
      updateAppBadgeCount(p.unreadCount);
    }

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Handle Push Notifications from Server / WebPush
self.addEventListener('push', (event) => {
  let data = {
    title: 'مجموعة خالد السليم ERP',
    body: 'تنبيه نظام جديد يتطلب المتابعة',
    icon: '/logo.png',
    badge: '/logo.png',
    tabKey: 'dashboard',
    unreadCount: 1,
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  const targetUrl =
    (data.data && data.data.url) ||
    (data.tabKey ? `/workspace/${data.tabKey}` : '/');

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    dir: 'rtl',
    lang: 'ar',
    tag: data.tag || `push-${Date.now()}`,
    renotify: true,
    vibrate: [150, 70, 150],
    data: {
      url: targetUrl,
      tabKey: data.tabKey || (data.data && data.data.tabKey) || null,
      notificationId: data.id || null
    },
    actions: [
      { action: 'open', title: 'فتح النظام الآن' },
      { action: 'mark_read', title: 'تحديد كمقروء' },
      { action: 'dismiss', title: 'إغلاق' }
    ]
  };

  event.waitUntil(
    Promise.all([
      updateAppBadgeCount(data.unreadCount || 1),
      self.registration.showNotification(data.title, options)
    ])
  );
});

// Notification Click Event: Focus/Open App & Route Directly to Target ERP Module
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';
  const tabKey = notifData.tabKey || null;
  const notificationId = notifData.notificationId || null;

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            action: event.action || 'open',
            tabKey,
            targetUrl,
            notificationId
          });
          if (event.action !== 'mark_read' && 'focus' in client) {
            return client.focus();
          }
          return;
        }
      }
      if (event.action !== 'mark_read' && self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Background Sync Event: Triggered automatically by OS when connectivity returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'alsulaim-erp-offline-sync' || event.tag.startsWith('alsulaim-')) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'PROCESS_OFFLINE_QUEUE',
            source: 'service-worker-sync',
            tag: event.tag,
            timestamp: new Date().toISOString()
          });
        });
      })
    );
  }
});

// Periodic Background Sync Event: Keep mobile state & notifications fresh in background
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'alsulaim-erp-periodic-check') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'PERIODIC_BACKGROUND_HEARTBEAT',
            timestamp: new Date().toISOString()
          });
        });
      })
    );
  }
});
