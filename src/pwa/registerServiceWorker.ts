export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });
      console.info('[PWA] Service Worker registrado:', registration.scope);
    } catch (err) {
      console.warn('[PWA] Error al registrar Service Worker:', err);
    }
  });
}
