# Puente Zardain — Sistema completo (Cliente + Admin + API)

App de pedidos online para restaurante con **área cliente**, **panel admin** y **API REST + PostgreSQL (Supabase)**.

## Requisitos

- **Node.js 18+**
- **PostgreSQL** (Supabase recomendado)
- npm

## Instalación

```bash
npm run install:all
copy server\.env.example server\.env
cd server && node scripts/check-db.mjs
```

## Desarrollo

```bash
npm run dev
```

| Servicio | URL |
|----------|-----|
| **Web cliente** | http://localhost:5173 |
| **Panel admin** | http://localhost:5173/admin |
| **API REST** | http://localhost:5000/api |

## Credenciales

### Admin
```
Email:    admin@zardain.com
Password: admin123
```

### Cliente
Registro/login en `/auth` con **email + código OTP** (6 dígitos por email).

## Stack

- **Frontend:** React 19, Vite, Zustand, Socket.io
- **Backend:** Node.js, Express, TypeScript, JWT
- **BD:** PostgreSQL (Supabase)
- **Email:** Nodemailer (Gmail) — OTP y notificaciones de pedido

## Funcionalidades principales

### Cliente
- Menú, carrito, checkout (recogida/domicilio, efectivo con cambio)
- Seguimiento de pedido en tiempo real
- Gamificación (Zardas, niveles, badges)
- Perfil personalizable, direcciones, chat, reseñas

### Admin
- Dashboard con ingresos del día, pedidos, métricas
- Pedidos, cocina, clientes, analíticas, carta, reseñas
- Control negocio (abrir/cerrar, saturación, horarios)

### Seguridad
- OTP email, JWT revocable (logout real)
- Validación Zod en auth y pedidos
- Zona de reparto por radio (km)

## Variables de entorno (`server/.env`)

Ver `server/.env.example` — mínimo: `DATABASE_URL`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Frontend + backend |
| `npm run build` | Build producción |
| `npm run lint` | ESLint |
| `cd server && node scripts/check-db.mjs` | Migraciones BD |

---

Desarrollado para **Puente Zardain** · Arroyomolinos 🌉🍔
