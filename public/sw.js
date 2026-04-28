self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'ONeil Family Calendar'
  const options = {
    body: data.body || 'You have an upcoming event',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'calendar-reminder',
    data: { url: data.url || '/' },
    requireInteraction: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'))
})