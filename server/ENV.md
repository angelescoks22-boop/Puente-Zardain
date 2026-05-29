# Variables de entorno — Puente Zardain (Supabase)

## Server (`server/.env`)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string PostgreSQL (Supabase pooler) |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave pública (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave servidor (opcional, admin) |
| `JWT_SECRET` | Firma de tokens |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin inicial (seed) |
| `CLIENT_URL` | CORS + Socket.io |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail (OTP). Requiere contraseña de aplicación |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | **Brevo u otro SMTP gratis** (recomendado) |
| `EMAIL_FROM` | Remitente visible, ej. `"Puente Zardain" <tu@email.com>` |
| `DELIVERY_RADIUS_KM` | Radio reparto en km (default 5) |
| `RESTAURANT_LAT` / `RESTAURANT_LNG` | Coordenadas del local |

## Frontend (`.env.local`)

```
VITE_SUPABASE_URL=https://TU_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

## Base de datos

1. Ejecuta `server/supabase/schema.sql` en el SQL Editor de Supabase
2. Arranca el server: `npm run dev` (seed automático)

## Arquitectura

```
server/src/
  config/db.ts     ← Pool PostgreSQL (pg)
  db/              ← Repositorios (users, orders, reviews…)
  models/          ← Solo tipos TypeScript
```
