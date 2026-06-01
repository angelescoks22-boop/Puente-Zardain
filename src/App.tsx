import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { HistoryPage } from './pages/HistoryPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { RewardsPage, ZardasPage } from './pages/ZardasPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { SuggestPage } from './pages/SuggestPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminLayout } from './admin/AdminLayout';
import { AdminDashboardPage } from './admin/pages/AdminDashboardPage';
import { AdminOrdersPage } from './admin/pages/AdminOrdersPage';
import { AdminHistoryPage } from './admin/pages/AdminHistoryPage';
import { AdminKitchenPage } from './admin/pages/AdminKitchenPage';
import { AdminCustomersPage } from './admin/pages/AdminCustomersPage';
import { AdminAnalyticsPage } from './admin/pages/AdminAnalyticsPage';
import { AdminMenuPage } from './admin/pages/AdminMenuPage';
import { AdminReviewsPage } from './admin/pages/AdminReviewsPage';
import { AdminRewardsPage } from './admin/pages/AdminRewardsPage';
import { AdminMessagesPage } from './admin/pages/AdminMessagesPage';
import { AdminSettingsPage } from './admin/pages/AdminSettingsPage';
import { AdminMapPage } from './admin/pages/AdminMapPage';
import { ChatPage } from './pages/ChatPage';
import { AdminChatPage } from './admin/pages/AdminChatPage';
import { SupportPage } from './pages/SupportPage';
import { MontadosPage, BocadillosPage } from './pages/MontadosPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AboutPage } from './pages/AboutPage';
import { QuickOrderPage } from './pages/QuickOrderPage';
import { useSettingsStore } from './store/settingsStore';
import { RequireAuth } from './components/auth/RequireAuth';
import { useOrderSocket } from './hooks/useOrderSocket';
import { ensureAppSocket } from './api/chatSocket';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { useThemeStore } from './store/themeStore';
import { AppAlert } from './components/ui/AppAlert';
import './styles/app.css';
import './styles/animations.css';

function AppInit() {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const loadFavorites = useAppStore((s) => s.loadFavorites);
  const startBusinessMessagesSync = useAppStore((s) => s.startBusinessMessagesSync);
  const startSettingsSync = useSettingsStore((s) => s.startSync);
  const initTheme = useThemeStore((s) => s.initTheme);

  useOrderSocket();

  useEffect(() => {
    initTheme();
    const hideSplash = () => {
      const splash = document.getElementById('splash');
      if (!splash) return;
      splash.classList.add('splash-hide');
      window.setTimeout(() => splash.remove(), 450);
    };

    // Mostrar la app al instante; la sesión carga en segundo plano
    hideSplash();
    void init().catch(() => {});
    ensureAppSocket();
    const stopMessagesSync = startBusinessMessagesSync();
    const stopSettingsSync = startSettingsSync();
    return () => {
      stopMessagesSync();
      stopSettingsSync();
    };
  }, [init, startBusinessMessagesSync, startSettingsSync, initTheme]);

  useEffect(() => {
    if (user?.role === 'client') loadFavorites(user.id);
  }, [user, loadFavorites]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <AppAlert />
      <Routes>
        {/* Panel Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="history" element={<AdminHistoryPage />} />
          <Route path="kitchen" element={<AdminKitchenPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="menu" element={<AdminMenuPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="rewards" element={<AdminRewardsPage />} />
          <Route path="messages" element={<AdminMessagesPage />} />
          <Route path="chat" element={<AdminChatPage />} />
          <Route path="map" element={<AdminMapPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Cliente */}
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="welcome" element={<OnboardingPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="quick" element={<QuickOrderPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="montados" element={<MontadosPage />} />
          <Route path="bocadillos" element={<BocadillosPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="order/:orderId" element={<RequireAuth><OrderTrackingPage /></RequireAuth>} />
          <Route path="history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
          <Route path="favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
          <Route path="zardas" element={<ZardasPage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="ai-recommendation" element={<SuggestPage />} />
          <Route path="suggest" element={<Navigate to="/ai-recommendation" replace />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
