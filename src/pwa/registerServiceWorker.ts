/** Desregistra service workers antiguos (evitaba caché obsoleta en móvil tras deploys). */
export function unregisterLegacyServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
}
