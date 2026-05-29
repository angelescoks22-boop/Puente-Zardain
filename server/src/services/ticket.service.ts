import type { IOrder } from '../models/Order.js';
import * as ordersRepo from '../db/orders.js';
import { formatDeliveryDetailsForTicket } from '../utils/deliveryAddress.js';

export type OrderTicket = {
  id: string;
  orderId: string;
  client: string;
  phone: string;
  address: string;
  addressDetails?: string;
  type: string;
  payment: string;
  cashPaidAmount?: number;
  cashChange?: number;
  time: string;
  items: string[];
  itemsDetailed: { name: string; quantity: number; unitPrice: number; mods: string }[];
  total: number;
  status: string;
};

export function buildOrderTicket(order: IOrder): OrderTicket {
  const itemsDetailed = order.items.map((i) => {
    const mods = i.removedIngredients.length ? `Sin: ${i.removedIngredients.join(', ')}` : '';
    return {
      name: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      mods,
    };
  });

  const lines = order.items.map((i) => {
    const mods = i.removedIngredients.length ? ` (Sin: ${i.removedIngredients.join(', ')})` : '';
    return `${i.quantity}x ${i.productName}${mods} — ${(i.unitPrice * i.quantity).toFixed(2)}€`;
  });

  return {
    id: order.id.slice(-6).toUpperCase(),
    orderId: order.id,
    client: order.clientName,
    phone: order.clientPhone,
    address: order.deliveryAddress?.fullAddress ?? order.address ?? 'Recogida en local',
    addressDetails: formatDeliveryDetailsForTicket(order.deliveryAddress),
    type: order.type === 'pickup' ? 'Recogida' : 'Entrega',
    payment:
      order.paymentMethod === 'cash'
        ? order.cashChange != null && order.cashPaidAmount != null
          ? `Efectivo (paga ${order.cashPaidAmount.toFixed(2)}€ · cambio ${order.cashChange.toFixed(2)}€)`
          : 'Efectivo'
        : 'Tarjeta',
    cashPaidAmount: order.cashPaidAmount,
    cashChange: order.cashChange,
    time: order.createdAt.toLocaleString('es-ES'),
    items: lines,
    itemsDetailed,
    total: order.total,
    status: order.status,
  };
}

export function ticketToPlainText(ticket: OrderTicket, notes?: string) {
  return `
=== PUENTE ZARDAIN ===
Pedido #${ticket.id}
${ticket.time}
Cliente: ${ticket.client}
Tel: ${ticket.phone}
${ticket.address}${ticket.addressDetails ? `\nDetalles: ${ticket.addressDetails}` : ''}
Tipo: ${ticket.type}
---
${ticket.items.join('\n')}
---
TOTAL: ${ticket.total.toFixed(2)} €
Pago: ${ticket.payment}
Estado: ${ticket.status}
${notes ? `NOTA: ${notes}` : ''}
======================
  `.trim();
}

export function ticketToHtml(ticket: OrderTicket) {
  const rows = ticket.itemsDetailed
    .map(
      (i) =>
        `<tr><td>${i.quantity}x ${i.name}${i.mods ? `<br><small>${i.mods}</small>` : ''}</td><td>${(i.unitPrice * i.quantity).toFixed(2)} €</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket #${ticket.id}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:400px;margin:24px auto;padding:16px}
h1{font-size:1.2rem;text-align:center;margin:0}
.meta{font-size:0.85rem;color:#64748b;margin:12px 0}
table{width:100%;border-collapse:collapse;margin:16px 0}
td{padding:6px 0;border-bottom:1px dashed #e2e8f0}
.total{font-size:1.1rem;font-weight:700;text-align:right;margin-top:12px}
</style></head><body>
<h1>🌉 Puente Zardain</h1>
<p class="meta">Pedido #${ticket.id}<br>${ticket.time}</p>
<p><strong>${ticket.client}</strong><br>${ticket.phone}<br>${ticket.address}${ticket.addressDetails ? `<br><small>Detalles: ${ticket.addressDetails}</small>` : ''}</p>
<table>${rows}</table>
<p class="total">TOTAL: ${ticket.total.toFixed(2)} € · ${ticket.payment}</p>
<p class="meta">Estado: ${ticket.status}</p>
</body></html>`;
}

export async function generateAndStoreTicket(order: IOrder) {
  const ticket = buildOrderTicket(order);
  order.ticketSnapshot = ticket as unknown as Record<string, unknown>;
  order.ticketGeneratedAt = new Date();
  await ordersRepo.save(order);
  return ticket;
}
