# Frontend ↔ Backend — Puente Zardain

## Desarrollo local

Vite proxy: `/api` y `/socket.io` → `http://localhost:5000`

```bash
npm run dev
```

## Producción (Netlify + Render)

Netlify solo sirve el frontend. El backend va en Render (`render.yaml` → servicio `puente-zardain-api`).

1. **Render:** New → Blueprint → repo → rellena `DATABASE_URL`, SMTP, `ADMIN_PASSWORD`, etc.
2. Comprueba: `https://puente-zardain-api.onrender.com/api/health` → `{ "ok": true }`
3. **Netlify:** push a `main` (o redeploy). `netlify.toml` hace proxy de `/api/*` y `/socket.io/*` al backend.
4. Si tu API en Render tiene **otra URL**, edita `netlify.toml` y vuelve a desplegar.
5. Tras el deploy: recarga con Ctrl+Shift+R (service worker `zardain-v3`).

Alternativa: variable en Netlify `VITE_API_URL=https://tu-api.onrender.com/api` + **Clear cache and deploy**.

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
