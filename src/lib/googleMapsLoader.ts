let loadPromise: Promise<void> | null = null;

export function getGoogleMapsApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';
}

export function loadGoogleMaps(): Promise<void> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return Promise.reject(new Error('Sin API key de Google Maps'));

  if (typeof google !== 'undefined' && google.maps?.places) {
    return Promise.resolve();
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=es&region=ES`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('No se pudo cargar Google Maps'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export const ARROYOMOLINOS_CENTER = { lat: 40.3019, lng: -3.8736 };
