const CACHE_NAME = 'vape-tracker-v117';

const minuteriesSteep = {};

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => caches.delete(cache))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});

self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data) return;

    if (data.action === 'PROGRAMMER_STEEP_NOTIF') {
        const { flaconId, nom, steepDays, delaiMs } = data;

        if (minuteriesSteep[flaconId]) {
            clearTimeout(minuteriesSteep[flaconId]);
        }

        minuteriesSteep[flaconId] = setTimeout(() => {
            self.registration.showNotification('Votre DIY est prêt ! 🌸', {
                body: `${nom} a terminé ses ${steepDays} jours de maturation. Il est temps de le découvrir !`,
                icon: 'icon.png',
                badge: 'icon.png',
                tag: `steep-${flaconId}`,
                data: { url: './', flaconId: flaconId }
            });
            delete minuteriesSteep[flaconId];
        }, delaiMs);
    }

    if (data.action === 'ANNULER_STEEP_NOTIF') {
        const { flaconId } = data;
        if (minuteriesSteep[flaconId]) {
            clearTimeout(minuteriesSteep[flaconId]);
            delete minuteriesSteep[flaconId];
        }
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('./') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./');
            }
        })
    );
});
