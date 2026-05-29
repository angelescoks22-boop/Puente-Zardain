import * as ordersRepo from '../db/orders.js';

export async function getActiveOrderCount() {
  return ordersRepo.countDocuments({
    status: { in: ['pending', 'accepted', 'preparing', 'ready', 'on_the_way'] },
  });
}

export async function getPendingQueueCount() {
  return ordersRepo.countDocuments({
    status: { in: ['pending', 'accepted', 'preparing'] },
  });
}
