# Frontend ↔ Backend — Puente Zardain

## Desarrollo local

Vite proxy: `/api` y `/socket.io` → `http://localhost:5000`

```bash
npm run dev
```

## Cliente HTTP (`src/api/client.ts`)

- Base URL: `VITE_API_URL` o `/api`
- Token JWT: `localStorage` (rememberMe) / `sessionStorage`
- Header: `Authorization: Bearer <token>`

## Socket (`src/api/chatSocket.ts`)

- `ensureAppSocket()` — conecta siempre (visitantes reciben `settings_update`)
- `getChatSocket()` — requiere login (chat, pedidos)

## Endpoints conectados

| Feature | Ruta |
|---------|------|
| Login | `POST /api/auth/login` |
| Productos | `GET /api/products?category=montados` |
| IA | `GET /api/products/recommendations` |
| Pedidos | `POST /api/orders` |
| Settings | `GET /api/settings/public` |
| Tiempo real | `settings_update` (socket) |
