# Backend Puente Zardain — Versión limpia

Backend TypeScript + Express + MongoDB. **Montados y bocadillos no son especiales: son solo categorías.**

## Principios

1. **Productos** — todos iguales: `name`, `description`, `price`, `category`, `ingredients`, `active`
2. **Settings** — una sola fuente de verdad para abierto/cerrado/saturado
3. **Pedidos** — bloqueo si cerrado; `estimatedTimeMinutes = prepTime + 10` si saturado
4. **IA** — shuffle real en `/api/products/recommendations`
5. **Socket** — `settings_update` emite el payload público completo

## Estructura

```
server/src/
├── config/db.ts
├── models/          User, Order, Product, Settings, Message, Review…
├── services/
│   ├── settings.service.ts   ← estado global + broadcast socket
│   ├── order.service.ts      ← crear pedido
│   ├── products.service.ts   ← listar + filtrar + recomendaciones
│   └── queue.service.ts      ← conteo cola
├── routes/
│   ├── auth.routes.ts
│   ├── orders.routes.ts
│   ├── products.routes.ts
│   └── settings.routes.ts
├── middleware/auth.ts
├── socket/chat.socket.ts
└── index.ts
```

## Settings (estado global)

```typescript
const isOpen = settings.ordersOpen && settings.businessStatus !== 'closed';
const isSaturated = settings.businessStatus === 'saturated';
```

Payload público:

```json
{
  "ordersOpen": true,
  "businessStatus": "open",
  "prepTimeMinutes": 20,
  "isOpen": true,
  "isSaturated": false,
  "minOrderAmount": 15,
  "deliveryArea": "Arroyomolinos"
}
```

## Pedidos

```typescript
if (!isOpen) throw new Error('Negocio cerrado');
let time = settings.prepTimeMinutes;
if (settings.businessStatus === 'saturated') time += 10;
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login (`rememberMe` → JWT 30d / 8h) |
| POST | `/api/orders` | Crear pedido |
| GET | `/api/products` | Todos los productos activos |
| GET | `/api/products?category=montados` | Filtrar por categoría |
| GET | `/api/products?category=bocadillos` | Filtrar por categoría |
| GET | `/api/products/recommendations?limit=3` | IA con shuffle |
| GET | `/api/products/recommendations?category=montados` | Recomendaciones contextuales |
| GET | `/api/settings/public` | Estado global |
| GET | `/api/products/settings/public` | Mismo payload (compat frontend) |

## Socket.io

Al cambiar estado (admin o jobs automáticos):

```typescript
io.emit('settings_update', { ordersOpen, businessStatus, prepTimeMinutes, isOpen, isSaturated, … });
```

## Arranque

```bash
cd server && npm run dev
# o desde raíz: npm run dev
```

Admin: `admin@zardain.com` / `admin123`

## Categorías válidas

`hamburguesas`, `bocadillos`, `montados`, `raciones`, `tostas`, `sandwiches`, `ensaladas`, `bebidas`
