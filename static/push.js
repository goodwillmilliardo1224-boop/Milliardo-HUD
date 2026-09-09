async function initPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
        const reg = await navigator.serviceWorker.register('/static/sw.js');
        console.log('Service Worker enregistré:', reg);

        // Récupère la clé publique VAPID depuis ton serveur
        const res = await fetch('/vapid-public-key');
        const { publicKey } = await res.json();

        if (!publicKey) {
            console.error('Clé publique VAPID non trouvée.');
            return;
        }

        // Convertir la clé en Uint8Array
        const converted = urlBase64ToUint8Array(publicKey);

        // Demander la permission à l'utilisateur et s'abonner
        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: converted
        });

        // Envoyer l'abonnement à ton serveur
        await fetch('/subscribe-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub)
        });
        console.log('Abonnement Push réussi');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du Push:', error);
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

// Lancer au chargement de la page
window.addEventListener('load', initPush);
