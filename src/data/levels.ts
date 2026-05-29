import type { LevelInfo, Reward } from '../types';

export const LEVELS: LevelInfo[] = [
  {
    id: 'hierro',
    name: 'Hierro',
    minOrders: 0,
    color: '#6b7280',
    benefits: ['Acceso al menú completo'],
  },
  {
    id: 'bronce',
    name: 'Bronce',
    minOrders: 3,
    color: '#cd7f32',
    benefits: ['+5 Zardas por pedido', 'Prioridad en cola'],
  },
  {
    id: 'plata',
    name: 'Plata',
    minOrders: 8,
    color: '#94a3b8',
    benefits: ['+10 Zardas por pedido', 'Bebida gratis cada 5 pedidos'],
  },
  {
    id: 'oro',
    name: 'Oro',
    minOrders: 15,
    color: '#eab308',
    benefits: ['+15 Zardas por pedido', 'Patatas gratis cada 3 pedidos'],
  },
  {
    id: 'platino',
    name: 'Platino',
    minOrders: 25,
    color: '#06b6d4',
    benefits: ['+20 Zardas por pedido', 'Descuento sorpresa ocasional'],
  },
  {
    id: 'diamante',
    name: 'Diamante',
    minOrders: 40,
    color: '#8b5cf6',
    benefits: ['+30 Zardas por pedido', 'Bocadillo gratis mensual', 'Máxima prioridad'],
  },
];

export const REWARDS: Reward[] = [
  { id: 'rw-1', name: 'Bebida gratis', description: 'Cualquier bebida del menú', zardasCost: 50, icon: '🥤' },
  { id: 'rw-2', name: 'Patatas Zardain', description: 'Ración de patatas', zardasCost: 80, icon: '🍟' },
  { id: 'rw-3', name: 'Bocadillo Mixto', description: 'Tu bocadillo favorito', zardasCost: 120, icon: '🥪' },
];

export const ZARDAS_PER_ORDER = 15;
export const ZARDAS_REGISTER = 25;
export const ZARDAS_FIRST_REVIEW = 30;
export const MIN_ORDER_AMOUNT = 15;
export const DELIVERY_AREA = 'Arroyomolinos';
