import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useOrderStore } from '../../store/orderStore';

export function FloatingChatButton() {
  const user = useAuthStore((s) => s.user);
  const unreadTotal = useChatStore((s) => s.unreadTotal);
  const activeOrder = useOrderStore((s) => s.activeOrder);
  const location = useLocation();

  if (!user || user.role === 'admin') return null;
  if (location.pathname.startsWith('/chat') || location.pathname.startsWith('/admin')) return null;

  const chatLink = activeOrder ? `/chat?orderId=${activeOrder.id}` : '/chat';

  return (
    <Link to={chatLink} className="floating-chat-btn" aria-label="Abrir chat">
      💬
      {unreadTotal > 0 && (
        <span className="floating-chat-badge">{unreadTotal > 9 ? '9+' : unreadTotal}</span>
      )}
    </Link>
  );
}
