import type { Order, User } from '../types';

export type Badge = {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
};

export function computeBadges(user: User, orders: Order[]): Badge[] {
  const delivered = orders.filter((o) => o.userId === user.id && o.status === 'delivered');
  const productCounts = new Map<string, number>();
  delivered.forEach((o) => {
    o.items.forEach((i) => {
      productCounts.set(i.productId, (productCounts.get(i.productId) ?? 0) + i.quantity);
    });
  });
  const topProductCount = Math.max(0, ...productCounts.values());

  return [
    {
      id: 'first_order',
      icon: '🎉',
      name: 'Primer pedido',
      description: 'Hiciste tu primer pedido',
      unlocked: user.orderCount >= 1,
    },
    {
      id: 'frequent',
      icon: '⭐',
      name: 'Cliente frecuente',
      description: '10+ pedidos completados',
      unlocked: user.orderCount >= 10,
    },
    {
      id: 'fan',
      icon: '🍔',
      name: 'Fan del producto',
      description: 'Pediste el mismo producto 5+ veces',
      unlocked: topProductCount >= 5,
    },
    {
      id: 'streak_3',
      icon: '🔥',
      name: 'Racha x3',
      description: '3 días seguidos pidiendo',
      unlocked: user.streak >= 3,
    },
    {
      id: 'streak_7',
      icon: '💎',
      name: 'Racha x7',
      description: '7 días seguidos pidiendo',
      unlocked: user.streak >= 7,
    },
    {
      id: 'level_gold',
      icon: '🏆',
      name: 'Nivel Oro',
      description: 'Alcanzaste nivel Oro o superior',
      unlocked: ['oro', 'platino', 'diamante'].includes(user.level),
    },
  ];
}

export function getUnlockedBadges(user: User, orders: Order[]) {
  return computeBadges(user, orders).filter((b) => b.unlocked);
}
