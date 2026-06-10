import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { BirthdayBanner } from '../gamification/BirthdayBanner';
import { OrderReadyOverlay } from '../order/OrderReadyOverlay';
import { Toast } from '../ui/Modal';
import { SystemStatusBanner } from './SystemStatusBanner';
import { ServerOfflineBanner } from './ServerOfflineBanner';
import { PendingCartBanner } from '../cart/PendingCartBanner';
import { FloatingCartBar } from '../cart/FloatingCartBar';
import { OnboardingRedirect } from '../onboarding/OnboardingRedirect';

const IMMERSIVE_PATHS = ['/welcome', '/about'];

export function AppLayout() {
  const location = useLocation();
  const toast = useAppStore((s) => s.toast);
  const clearToast = useAppStore((s) => s.clearToast);
  const user = useAuthStore((s) => s.user);
  const initChat = useChatStore((s) => s.init);

  useEffect(() => {
    if (user?.role === 'client') initChat();
  }, [user, initChat]);

  const immersive = IMMERSIVE_PATHS.includes(location.pathname);

  return (
    <div className={`app-shell ${immersive ? 'app-shell--immersive' : ''}`}>
      {!immersive && <Header />}
      {!immersive && <ServerOfflineBanner />}
      {!immersive && <SystemStatusBanner />}
      <PendingCartBanner />
      <BirthdayBanner />
      <main key={location.pathname} className="app-main page-enter">
        <OnboardingRedirect />
        <Outlet />
      </main>
      <FloatingCartBar />
      {!immersive && <BottomNav />}
      <OrderReadyOverlay />
      {toast && <Toast message={toast} onClose={clearToast} />}
    </div>
  );
}
