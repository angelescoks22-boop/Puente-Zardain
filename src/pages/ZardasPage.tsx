import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { REWARDS } from '../data/levels';
import { redeemReward } from '../api/products';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { LevelCard } from '../components/gamification/LevelCard';
import { getNextRewardProgress } from '../utils/gamification';
import { useAppStore } from '../store/appStore';

export function ZardasPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const showToast = useAppStore((s) => s.showToast);
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="page zardas-page">
        <h1>💎 Zardas</h1>
        <Card className="auth-cta">
          <p>Regístrate para empezar a ganar Zardas con cada pedido</p>
          <Button fullWidth onClick={() => navigate('/auth')}>Entrar / Registrarse</Button>
        </Card>
      </div>
    );
  }

  const { nextReward, remaining, progress } = getNextRewardProgress(user.zardas, REWARDS);

  const handleRedeem = async (rewardId: string, cost: number, name: string) => {
    if (user.zardas < cost) {
      showToast('Zardas insuficientes');
      return;
    }
    setLoading(rewardId);
    try {
      await redeemReward(user.id, cost);
      const updated = useAuthStore.getState().user;
      if (updated) setUser(updated);
      showToast(`🎁 Canjeado: ${name}. Preséntalo en tu próximo pedido.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="page zardas-page">
      <h1>💎 Zardas</h1>

      <Card className="zardas-explainer">
        <h2>¿Qué son las Zardas?</h2>
        <p>
          Las Zardas son puntos que ganas cada vez que haces un pedido en Puente Zardain.
        </p>
        <p>
          Puedes usarlas para conseguir descuentos o recompensas en el local.
        </p>
        <p className="zardas-explainer-highlight">
          Cuanto más pidas… más ganas 🔥
        </p>
      </Card>

      <Card className="zardas-balance">
        <span className="big-zardas">💎 {user.zardas}</span>
        <p>Tus Zardas actuales</p>
        {nextReward && remaining > 0 && (
          <ProgressBar value={progress} label={`Te faltan ${remaining} Zardas para tu próximo premio`} />
        )}
      </Card>

      <LevelCard level={user.level} orderCount={user.orderCount} />

      <section className="section">
        <h2>🎁 Canjear recompensas</h2>
        <div className="rewards-grid">
          {REWARDS.map((reward) => (
            <Card key={reward.id} className="reward-card">
              <span className="reward-icon">{reward.icon}</span>
              <h3>{reward.name}</h3>
              <p>{reward.description}</p>
              <span className="reward-cost">💎 {reward.zardasCost}</span>
              <Button
                fullWidth
                size="sm"
                disabled={user.zardas < reward.zardasCost || loading === reward.id}
                onClick={() => handleRedeem(reward.id, reward.zardasCost, reward.name)}
              >
                {user.zardas >= reward.zardasCost ? 'Canjear' : `Faltan ${reward.zardasCost - user.zardas}`}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <Card className="earn-info">
        <h3>¿Cómo ganar más Zardas?</h3>
        <ul>
          <li>🛒 +15 por cada pedido (+ bonus por nivel)</li>
          <li>📝 +25 al registrarte</li>
          <li>⭐ +30 por tu primera reseña</li>
          <li>🔥 Bonus por rachas de pedidos consecutivos</li>
          <li>🎂 Regalo especial en tu cumpleaños</li>
        </ul>
        <Button variant="secondary" fullWidth onClick={() => navigate('/menu')}>
          Ver carta y pedir
        </Button>
      </Card>
    </div>
  );
}

/** Alias para compatibilidad con /rewards */
export function RewardsPage() {
  return <ZardasPage />;
}
