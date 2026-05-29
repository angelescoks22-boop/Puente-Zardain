import { useCallback } from 'react';
import { adminApi, useAdminPoll, type MapOrder } from '../api/adminApi';

const RESTAURANT = { lat: 40.3347, lng: -3.9167, name: 'Puente Zardain' };

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#3b82f6',
  preparing: '#8b5cf6',
  ready: '#22c55e',
  on_the_way: '#06b6d4',
};

function projectPoint(lat: number, lng: number, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  const pad = 0.08;
  const latRange = (bounds.maxLat - bounds.minLat) || 0.01;
  const lngRange = (bounds.maxLng - bounds.minLng) || 0.01;
  const x = ((lng - bounds.minLng + pad) / (lngRange + pad * 2)) * 100;
  const y = 100 - ((lat - bounds.minLat + pad) / (latRange + pad * 2)) * 100;
  return { left: `${Math.min(95, Math.max(5, x))}%`, top: `${Math.min(95, Math.max(5, y))}%` };
}

function computeBounds(orders: MapOrder[]) {
  const lats = [RESTAURANT.lat, ...orders.map((o) => o.lat)];
  const lngs = [RESTAURANT.lng, ...orders.map((o) => o.lng)];
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

export function AdminMapPage() {
  const fetcher = useCallback(() => adminApi.getMapOrders(), []);
  const { data: orders, loading } = useAdminPoll(fetcher, 8000);

  const list = orders ?? [];
  const bounds = computeBounds(list);

  return (
    <div className="admin-map-page">
      <h2>📍 Mapa de pedidos activos</h2>
      <p className="hint">Entregas en curso en {RESTAURANT.name} · Arroyomolinos</p>

      <div className="admin-grid admin-grid-2" style={{ marginTop: 16 }}>
        <div className="map-container stat-card">
          <div className="map-canvas">
            <div
              className="map-marker map-restaurant"
              style={projectPoint(RESTAURANT.lat, RESTAURANT.lng, bounds)}
              title={RESTAURANT.name}
            >
              🏪
            </div>
            {list.map((o) => (
              <div
                key={o.id}
                className="map-marker map-delivery"
                style={{
                  ...projectPoint(o.lat, o.lng, bounds),
                  borderColor: STATUS_COLORS[o.status] ?? '#64748b',
                }}
                title={`${o.clientName} — ${o.address}`}
              >
                🛵
              </div>
            ))}
            {list.length === 0 && !loading && (
              <p className="map-empty">No hay entregas activas con ubicación</p>
            )}
          </div>
          <div className="map-legend">
            <span>🏪 Local</span>
            <span>🛵 Entrega activa</span>
          </div>
        </div>

        <div className="stat-card">
          <h3>Pedidos en reparto ({list.length})</h3>
          {loading && <p>Cargando mapa...</p>}
          <ul className="map-order-list">
            {list.map((o) => (
              <li key={o.id}>
                <strong>#{o.id.slice(-6).toUpperCase()}</strong>
                <span>{o.clientName}</span>
                <span className={`status-tag status-${o.status}`}>{o.status}</span>
                <small>{o.address}</small>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${o.lat}&mlon=${o.lng}#map=16/${o.lat}/${o.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir en mapa →
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

