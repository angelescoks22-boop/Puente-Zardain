import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { claimBirthdayReward, getBirthdayStatus } from '../../api/auth';
import { Button } from '../ui/Button';

export function BirthdayBanner() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const showToast = useAppStore((s) => s.showToast);
  const addNotification = useAppStore((s) => s.addNotification);
  const [claiming, setClaiming] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<{
    isBirthday: boolean;
    claimed: boolean;
    zardasReward: number;
    freeProduct: string;
  } | null>(null);

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    getBirthdayStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [user]);

  if (!user || dismissed || !status?.isBirthday) return null;

  const handleClaim = async () => {
    if (status.claimed || claiming) return;
    setClaiming(true);
    try {
      const result = await claimBirthdayReward();
      setUser(result.user);
      setStatus((s) => (s ? { ...s, claimed: true } : s));
      showToast(`🎉 +${result.zardasAwarded} Zardas de cumpleaños`);
      addNotification(
        '¡Feliz cumpleaños!',
        `${result.zardasAwarded} Zardas + ${result.freeProduct} en tu próximo pedido`,
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al reclamar');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="birthday-banner card">
      <div className="birthday-banner-content">
        <span className="birthday-icon" aria-hidden>🎉</span>
        <div>
          <strong>¡Feliz cumpleaños, {user.name.split(' ')[0]}!</strong>
          <p>
            {status.claimed
              ? 'Recompensa reclamada · Disfruta tu regalo en el próximo pedido'
              : `Tienes una recompensa: ${status.zardasReward} Zardas + ${status.freeProduct}`}
          </p>
        </div>
      </div>
      <div className="birthday-banner-actions">
        {!status.claimed && (
          <Button size="sm" onClick={handleClaim} disabled={claiming}>
            {claiming ? 'Reclamando…' : 'Reclamar regalo'}
          </Button>
        )}
        <button type="button" className="link-btn" onClick={() => setDismissed(true)}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
