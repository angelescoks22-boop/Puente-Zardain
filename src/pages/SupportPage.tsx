import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const FAQ = [
  {
    q: '¿Dónde repartís?',
    a: 'Solo entregamos en Arroyomolinos. Al registrarte debes indicar una dirección válida dentro de la zona.',
  },
  {
    q: '¿Cómo pago mi pedido?',
    a: 'Pago al recoger o al recibir la entrega, en efectivo o tarjeta. No hay pago online.',
  },
  {
    q: '¿Puedo modificar un pedido?',
    a: 'Si acabas de hacerlo, escríbenos por chat lo antes posible. Una vez en cocina no podemos cambiarlo.',
  },
  {
    q: '¿Qué son las Zardas?',
    a: 'Puntos de fidelización que ganas con cada pedido y canjeas por recompensas en la app.',
  },
  {
    q: '¿Cuánto tarda un pedido?',
    a: 'Depende de la cola. Verás la posición y el estado en tiempo real en la pantalla de seguimiento.',
  },
];

export function SupportPage() {
  return (
    <div className="page support-page">
      <h1>🆘 Ayuda y soporte</h1>
      <p className="hint">Resolvemos tus dudas sobre pedidos, entregas y la app.</p>

      <Card>
        <h3>Contacto rápido</h3>
        <p>¿Necesitas ayuda con un pedido activo?</p>
        <Button fullWidth onClick={() => window.location.assign('/chat')}>
          💬 Abrir chat con el local
        </Button>
        <p className="hint" style={{ marginTop: 12 }}>
          Teléfono: consulta en el local · Horario según carta
        </p>
      </Card>

      <Card>
        <h3>Preguntas frecuentes</h3>
        <ul className="faq-list">
          {FAQ.map((item) => (
            <li key={item.q} className="faq-item">
              <strong>{item.q}</strong>
              <p>{item.a}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3>Más opciones</h3>
        <div className="support-links">
          <Link to="/history" className="support-link">📜 Ver historial de pedidos</Link>
          <Link to="/profile" className="support-link">👤 Mi perfil y direcciones</Link>
          <Link to="/reviews" className="support-link">⭐ Dejar una reseña</Link>
        </div>
      </Card>
    </div>
  );
}
