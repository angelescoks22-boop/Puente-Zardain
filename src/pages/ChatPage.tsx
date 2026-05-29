import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useChatStore } from '../store/chatStore';
import {
  getConversation,
  getChatByOrder,
  getMyConversations,
  startConversation,
  type ChatMessage,
  type Conversation,
} from '../api/chat';
import { appendUnique, useChat } from '../hooks/useChatSocket';
import { ChatBox } from '../components/chat/ChatBox';
import { ErrorRetry } from '../components/ui/ErrorRetry';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDate } from '../utils/format';

export function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get('orderId');
  const user = useAuthStore((s) => s.user);
  const addNotification = useAppStore((s) => s.addNotification);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const refreshUnread = useChatStore((s) => s.refreshUnread);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleNewMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => appendUnique(prev, msg));
    if (msg.sender === 'admin') {
      addNotification('Nuevo mensaje', msg.message.slice(0, 80));
    }
  }, [addNotification]);

  const { sendMessage } = useChat(conversationId, handleNewMessage);

  const loadConversation = useCallback(async (orderId?: string | null) => {
    setLoading(true);
    setError('');
    try {
      if (orderId) {
        const data = await getChatByOrder(orderId);
        setConversationId(data.conversation.id);
        setMessages(data.messages);
        setActiveConversation(data.conversation.id);
      } else {
        const convs = await getMyConversations();
        setConversations(convs);
        if (convs.length > 0) {
          const data = await getConversation(convs[0].id);
          setConversationId(data.conversation.id);
          setMessages(data.messages);
          setActiveConversation(data.conversation.id);
        } else {
          const conv = await startConversation();
          const data = await getConversation(conv.id);
          setConversationId(data.conversation.id);
          setMessages(data.messages);
          setActiveConversation(data.conversation.id);
        }
      }
      void refreshUnread();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el chat');
    } finally {
      setLoading(false);
    }
  }, [setActiveConversation, refreshUnread]);

  useEffect(() => {
    if (!user) return;
    void loadConversation(orderIdParam);
    return () => {
      setActiveConversation(null);
      void refreshUnread();
    };
  }, [user, orderIdParam, loadConversation, setActiveConversation, refreshUnread]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    await sendMessage(text);
    setSending(false);
  };

  const openOrderChat = async (orderId?: string, convId?: string) => {
    if (orderId) {
      navigate(`/chat?orderId=${orderId}`);
      return;
    }
    if (convId) {
      setLoading(true);
      const data = await getConversation(convId);
      setConversationId(data.conversation.id);
      setMessages(data.messages);
      setActiveConversation(data.conversation.id);
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="page">
        <Card className="auth-cta">
          <p>Inicia sesión para chatear con el restaurante</p>
          <Button fullWidth onClick={() => navigate('/auth')}>Entrar</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="page chat-page">
      <h1>💬 Chat con Zardain</h1>
      <p className="hint">
        {orderIdParam ? 'Chat vinculado a tu pedido' : 'Comunicación directa · tiempo real'}
      </p>

      {!orderIdParam && conversations.length > 1 && (
        <div className="chat-order-tabs">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chat-order-tab ${conversationId === c.id ? 'active' : ''}`}
              onClick={() => openOrderChat(c.orderId, c.id)}
            >
              {c.orderId ? `Pedido #${c.orderId.slice(-6)}` : 'General'}
              {c.unreadByUser > 0 && <span className="chat-tab-badge">{c.unreadByUser}</span>}
              {c.lastMessageAt && <small>{formatDate(c.lastMessageAt)}</small>}
            </button>
          ))}
        </div>
      )}

      {error && (
        <ErrorRetry
          message={error}
          onRetry={() => loadConversation(orderIdParam)}
        />
      )}

      <Card className="chat-window">
        <ChatBox
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          mySender="user"
          loading={loading}
          emptyHint="¡Hola! Escríbenos si tienes dudas sobre tu pedido."
        />
      </Card>
    </div>
  );
}
