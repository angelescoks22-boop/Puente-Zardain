const STATUS_LABELS: Record<string, string> = {
  received: 'Recibido',
  pending: 'Pendiente',
  accepted: 'Aceptado',
  preparing: 'En cocina',
  ready: 'Listo',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export function getOrderStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
