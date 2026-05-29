import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function AboutPage() {
  return (
    <div className="page about-page">
      <div className="about-hero">
        <div className="about-hero-image" aria-hidden>
          <span className="about-hero-emoji">🧑‍🍳</span>
        </div>
        <h1>👨‍🍳 Sobre Puente Zardain</h1>
      </div>

      <article className="about-content">
        <p className="about-lead">
          En Puente Zardain creemos en lo de siempre:
          <strong> buena comida, producto de calidad y trato cercano.</strong>
        </p>

        <p>
          No somos una cadena ni una app más.
          <br />
          Somos un bar de verdad, de los de siempre.
        </p>

        <p>
          Aquí todo se hace como toca:
          a fuego lento, con ingredientes buenos
          y con ganas de que vuelvas.
        </p>

        <p className="about-highlight">
          Ahora puedes pedir sin llamar, sin esperar,
          pero seguimos siendo los mismos de siempre.
        </p>

        <div className="about-badges">
          <span>📍 En Arroyomolinos, como siempre</span>
          <span>🍔 Hecho al momento</span>
          <span>❤️ Trato de bar de barrio</span>
        </div>

        <blockquote className="about-thanks">
          Gracias por confiar en nosotros 🙌
        </blockquote>
      </article>

      <div className="about-actions">
        <Button fullWidth size="lg" onClick={() => window.history.back()}>
          Volver
        </Button>
        <Link to="/menu" className="about-menu-link">
          Ver carta completa →
        </Link>
      </div>
    </div>
  );
}
