import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().uuid('Producto inválido'),
  quantity: z.coerce.number().int().min(1).max(50),
  removedIngredients: z.array(z.string()).optional().default([]),
  unitPrice: z.coerce.number().positive(),
});

const deliveryAddressSchema = z.object({
  fullAddress: z.string().min(5),
  city: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  portal: z.string().optional(),
  floor: z.string().optional(),
  door: z.string().optional(),
  details: z.string().optional(),
  placeId: z.string().optional(),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'El pedido está vacío'),
  total: z.coerce.number().positive('Total inválido'),
  type: z.enum(['pickup', 'delivery']),
  paymentMethod: z.enum(['cash', 'card']),
  cashPaidAmount: z.coerce.number().optional(),
  address: z.string().optional(),
  deliveryAddress: deliveryAddressSchema.optional(),
});
