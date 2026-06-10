import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getRewards, redeemReward, getPendingRedemptions } from '../api/products';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { LevelCard } from '../components/gamification/LevelCard';
import { getNextRewardProgress } from '../utils/gamification';
import { useAppStore } from '../store/appStore';
import type { Reward } from '../types';

export function ZardasPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const showToast = useAppStore((s) => s.showToast);
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardsError, setRewardsError] = useState(false);
  const [pendingRedemptions, setPendingRedemptions] = useState<
    { id: string; rewardName: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    getRewards()
      .then((list) => {
        setRewards(list);
        setRewardsError(false);
      })
      .catch(() => setRewardsError(true));
    if (user) {
      getPendingRedemptions()
        .then(setPendingRedemptions)
        .catch(() => setPendingRedemptions([]));
    }
  }, [user]);

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

  const { nextReward, remaining, progress } = getNextRewardProgress(user.zardas, rewards);

  const handleRedeem = async (rewardId: string, cost: number) => {
    if (user.zardas < cost) {
      showToast('Zardas insuficientes');
      return;
    }
    setLoading(rewardId);
    try {
      const result = await redeemReward(rewardId);
      setUser(result.user);
      showToast(result.message);
      const pending = await getPendingRedemptions();
      setPendingRedemptions(pending);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo canjear');
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

      {pendingRedemptions.length > 0 && (
        <section className="section">
          <h2>📋 Canjes pendientes</h2>
          <p className="hint">Aplícalos al hacer tu próximo pedido en checkout.</p>
          {pendingRedemptions.map((r) => (
            <Card key={r.id} className="reward-card">
              <strong>{r.rewardName}</strong>
              <p className="hint">Pendiente de usar en pedido</p>
            </Card>
          ))}
        </section>
      )}

      <section className="section">
        <h2>🎁 Canjear recompensas</h2>
        <p className="hint">Al canjear, se aplicará en tu próximo pedido.</p>
        {rewardsError && (
          <p className="form-error">No se pudieron cargar las recompensas. Inténtalo más tarde.</p>
        )}
        {rewards.length === 0 && !rewardsError && (
          <p className="hint">No hay recompensas disponibles ahora mismo.</p>
        )}
        <div className="rewards-grid">
          {rewards.map((reward) => (
            <Card key={reward.id} className="reward-card">
              <span className="reward-icon">{reward.icon}</span>
              <h3>{reward.name}</h3>
              <p>{reward.description}</p>
              <span className="reward-cost">💎 {reward.zardasCost}</span>
              <Button
                fullWidth
                size="sm"
                disabled={user.zardas < reward.zardasCost || loading === reward.id}
                onClick={() => handleRedeem(reward.id, reward.zardasCost)}
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
