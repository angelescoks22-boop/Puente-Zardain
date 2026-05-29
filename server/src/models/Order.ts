export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export interface IOrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  removedIngredients: string[];
  unitPrice: number;
}

export interface IOrder {
  id: string;
  userId: string;
  clientName: string;
  clientPhone: string;
  items: IOrderItem[];
  total: number;
  type: 'pickup' | 'delivery';
  paymentMethod: 'cash' | 'card';
  cashPaidAmount?: number;
  cashChange?: number;
  address?: string;
  deliveryAddress?: {
    fullAddress: string;
    city: string;
    lat: number;
    lng: number;
    portal?: string;
    floor?: string;
    door?: string;
    details?: string;
  };
  deliveryLat?: number;
  deliveryLng?: number;
  status: OrderStatus;
  queuePosition: number;
  estimatedTimeMinutes?: number;
  completedAt?: Date;
  pickedUp: boolean;
  internalNotes?: string;
  cancelReason?: string;
  ticketSnapshot?: Record<string, unknown>;
  ticketGeneratedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}
