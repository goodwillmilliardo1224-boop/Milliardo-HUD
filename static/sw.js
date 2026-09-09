self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Milliardo HUD';
    const options = {
        body: data.body || 'Nouvelle mise à jour !',
        icon: '/static/img/accueilicon.png',  // Mis à jour avec une icône existante
        badge: '/static/img/accueilicon.png'
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});
