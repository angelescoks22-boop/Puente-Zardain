import { useState } from 'react';
import { getOrderTicket, downloadTicketHtml } from '../../api/orders';
import { Button } from '../ui/Button';
import { ErrorRetry } from '../ui/ErrorRetry';
import { Spinner } from '../ui/Spinner';

type Props = {
  orderId: string;
};

export function OrderTicketDownload({ orderId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setLoading(true);
    setError('');
    try {
      const ticket = await getOrderTicket(orderId);
      downloadTicketHtml(ticket);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al descargar ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-ticket-download">
      {error && <ErrorRetry message={error} onRetry={handleDownload} />}
      <Button variant="secondary" fullWidth onClick={handleDownload} disabled={loading}>
        {loading ? <Spinner size="sm" /> : '🧾 Descargar ticket'}
      </Button>
    </div>
  );
}
