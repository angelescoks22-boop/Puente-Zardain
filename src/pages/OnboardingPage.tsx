import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useCartStore } from '../store/cartStore';
import { useAppStore } from '../store/appStore';
import { getUsualOrder } from '../utils/recommendations';
import {
  hasSeenOnboarding,
  markOnboardingSeen,
  incrementVisitCount,
  isReturningUser,
} from '../utils/onboardingStorage';
import { HomeActionHub, useHomeActions } from '../components/home/HomeActionHub';
import { useSettingsStore, isStoreOpen } from '../store/settingsStore';

export function OnboardingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const orders = useOrderStore((s) => s.orders);
  const repeatOrder = useCartStore((s) => s.repeatOrder);
  const showToast = useAppStore((s) => s.showToast);
  const settings = useSettingsStore();
  const ordersOpen = isStoreOpen(settings);

  const returning = isReturningUser();
  const lastOrder = user ? getUsualOrder(orders, user.id) : null;

  useEffect(() => {
    incrementVisitCount();
    if (user) {
      useOrderStore.getState().fetchOrders(user.id).catch(() => {});
    }
  }, [user]);

  const finish = useCallback((path: string) => {
    markOnboardingSeen();
    navigate(path);
  }, [navigate]);

  const handleRepeat = useCallback(() => {
    if (!lastOrder) return;
    repeatOrder(lastOrder);
    showToast('🔄 ¡Pedido repetido!');
    finish('/cart');
  }, [lastOrder, repeatOrder, showToast, finish]);

  const actions = useHomeActions(lastOrder, handleRepeat, ordersOpen);

  const skipHome = () => {
    markOnboardingSeen();
    navigate('/');
  };

  return (
    <div className="page onboarding-page">
      <div className="onboarding-bg" aria-hidden />

      <header className="onboarding-header">
        {returning && (
          <button type="button" className="onboarding-skip" onClick={skipHome}>
            Ir al inicio →
          </button>
        )}
      </header>

      <section className="onboarding-chat">
        <div className="onboarding-avatar">🤖</div>
        <div className="onboarding-messages">
          <div className="chat-bubble chat-bubble--bot onboarding-bubble" style={{ animationDelay: '0.05s' }}>
            {returning ? '👋 ¡Hola de nuevo!' : '👋 Bienvenido a Puente Zardain'}
          </div>
          <div className="chat-bubble chat-bubble--bot onboarding-bubble" style={{ animationDelay: '0.18s' }}>
            {returning
              ? '¿Qué te apetece hoy? Elige y empezamos.'
              : '¿Cómo quieres pedir hoy?'}
          </div>
          {!hasSeenOnboarding() && (
            <div className="chat-bubble chat-bubble--bot onboarding-bubble onboarding-bubble--soft" style={{ animationDelay: '0.3s' }}>
              Sin llamadas, sin esperas — solo buena comida 🍔
            </div>
          )}
        </div>
      </section>

      <HomeActionHub
        actions={actions}
        onNavigate={finish}
        className="onboarding-actions"
      />

      {returning && (
        <p className="onboarding-footer-hint">
          Puedes volver aquí desde Inicio cuando quieras
        </p>
      )}
    </div>
  );
}
