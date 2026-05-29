export interface IOrderStatusLog {
  id: string;
  orderId: string;
  fromStatus: string;
  toStatus: string;
  changedById?: string;
  changedByName: string;
  changedByRole: 'admin' | 'system';
  reason?: string;
  createdAt: Date;
}
