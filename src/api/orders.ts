import type { Order, ValidatedAddress } from '../types';
import { apiFetch } from './client';

export type OrderTicket = {
  id: string;
  client: string;
  phone: string;
  address: string;
  type: string;
  payment: string;
  time: string;
  items: string[];
  total: number;
  status: string;
};

type CreateOrderInput = {
  userId: string;
  items: {
    productId: string;
    quantity: number;
    removedIngredients: string[];
    unitPrice: number;
  }[];
  total: number;
  type: Order['type'];
  paymentMethod: Order['paymentMethod'];
  cashPaidAmount?: number;
  address?: string;
  deliveryAddress?: ValidatedAddress;
  redemptionId?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  return apiFetch<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: input.items,
      total: input.total,
      type: input.type,
      paymentMethod: input.paymentMethod,
      cashPaidAmount: input.cashPaidAmount,
      address: input.address,
      deliveryAddress: input.deliveryAddress,
      redemptionId: input.redemptionId,
    }),
  });
}

export async function getOrdersByUser(_userId: string): Promise<Order[]> {
  return apiFetch<Order[]>('/orders/my');
}

export async function getActiveOrder(_userId: string): Promise<Order | null> {
  return apiFetch<Order | null>('/orders/active');
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    return await apiFetch<Order>(`/orders/${orderId}`);
  } catch {
    return null;
  }
}

export async function getOrderTicket(orderId: string): Promise<OrderTicket> {
  return apiFetch(`/orders/${orderId}/ticket`);
}

export function downloadTicketHtml(ticket: OrderTicket) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Ticket #${ticket.id} — Puente Zardain</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 360px; margin: 24px auto; padding: 16px; }
    h1 { font-size: 1.2rem; margin: 0 0 8px; }
    .meta { color: #666; font-size: 0.85rem; margin-bottom: 16px; }
    ul { list-style: none; padding: 0; margin: 0 0 16px; }
    li { padding: 6px 0; border-bottom: 1px dashed #ddd; font-size: 0.9rem; }
    .total { font-size: 1.1rem; font-weight: bold; text-align: right; }
    .footer { margin-top: 24px; text-align: center; font-size: 0.8rem; color: #888; }
  </style>
</head>
<body>
  <h1>🍔 Puente Zardain</h1>
  <p class="meta">Ticket #${ticket.id}<br/>${ticket.time}</p>
  <p><strong>${ticket.client}</strong><br/>${ticket.phone}</p>
  <p>${ticket.type} · ${ticket.address}<br/>Pago: ${ticket.payment}</p>
  <ul>${ticket.items.map((i) => `<li>${i}</li>`).join('')}</ul>
  <p class="total">Total: ${ticket.total.toFixed(2)} €</p>
  <p class="footer">Gracias por tu pedido</p>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket-zardain-${ticket.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function submitOrderFeedback(
  orderId: string,
  rating: 'like' | 'dislike',
  comment?: string,
) {
  return apiFetch(`/orders/${orderId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
}

export async function getOrderFeedback(orderId: string) {
  return apiFetch<{ rating: string; comment?: string } | null>(`/orders/${orderId}/feedback`);
}
