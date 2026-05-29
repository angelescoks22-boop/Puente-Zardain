export interface IDailyReport {
  id: string;
  date: string;
  totalOrders: number;
  totalRevenue: number;
  topProduct: string;
  peakHour: string;
  newClients: number;
  recurringClients: number;
  avgTicket: number;
  cancelledOrders: number;
  summary: string;
  createdAt: Date;
}
