import { useEffect, useState, useRef, useMemo } from 'react';
import {
  getAllConversations,
  getConversation,
  type ChatMessage,
  type Conversation,
} from '../../api/chat';
import { appendUnique, useChat } from '../../hooks/useChatSocket';
import { onChatMessage, onConversationUpdate } from '../../api/chatSocket';
import { ChatBox } from '../../components/chat/ChatBox';
import { formatDate } from '../../utils/format';

type ChatFilter = 'all' | 'active' | 'unread';

const ADMIN_QUICK_REPLIES = [
  'En 10 min está listo',
  'Ya está preparando',
  'Sin problema',
  'Tu pedido sale en breve',
  'Gracias por tu paciencia',
];

export function AdminChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<ChatFilter>('all');
  const selectedRef = useRef<Conversation | null>(null);
  selectedRef.current = selected;

  const { sendMessage } = useChat(selected?.id ?? null);

  const loadConversations = () => {
    getAllConversations().then(setConversations).catch(() => {});
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return onConversationUpdate((conv) => {
      const c = conv as Conversation;
      setConversations((prev) => {
        const rest = prev.filter((x) => x.id !== c.id);
        return [c, ...rest];
      });
    });
  }, []);

  useEffect(() => {
    return onChatMessage((msg) => {
      if (msg.conversationId === selectedRef.current?.id) {
        setMessages((prev) => appendUnique(prev, msg));
      }
      loadConversations();
    });
  }, []);

  const filtered = useMemo(() => {
    let list = [...conversations];
    if (filter === 'active') list = list.filter((c) => c.status === 'active');
    if (filter === 'unread') list = list.filter((c) => c.unreadByAdmin > 0);
    return list.sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });
  }, [conversations, filter]);

  const openConversation = async (conv: Conversation) => {
    setSelected(conv);
    try {
      const data = await getConversation(conv.id);
      setMessages(data.messages);
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadByAdmin: 0 } : c)),
      );
    } catch {
      setMessages([]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selected || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    await sendMessage(text);
    setSending(false);
  };

  const handleQuickReply = async (text: string) => {
    if (!selected || sending) return;
    setInput(text);
    setSending(true);
    await sendMessage(text);
    setInput('');
    setSending(false);
  };

  return (
    <div className="admin-chat">
      <h2>💬 Chat con clientes</h2>
      <p className="hint">Tiempo real · vinculado a pedidos</p>

      <div className="chat-filters">
        {(['all', 'active', 'unread'] as ChatFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`status-btn ${filter === f ? 'current' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Sin responder'}
            {f === 'unread' && conversations.filter((c) => c.unreadByAdmin > 0).length > 0 && (
              <span className="chat-filter-badge">
                {conversations.filter((c) => c.unreadByAdmin > 0).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="admin-chat-layout">
        <div className="chat-list">
          {filtered.length === 0 && (
            <p className="hint" style={{ padding: 16 }}>Sin conversaciones</p>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chat-list-item ${selected?.id === c.id ? 'active' : ''} ${c.unreadByAdmin > 0 ? 'has-unread' : ''}`}
              onClick={() => openConversation(c)}
            >
              <strong>{c.userName}</strong>
              {c.orderId && <small className="chat-order-ref">Pedido #{c.orderId.slice(-6)}</small>}
              <p>{c.lastMessage ?? 'Sin mensajes'}</p>
              <small>{c.lastMessageAt ? formatDate(c.lastMessageAt) : ''}</small>
              {c.unreadByAdmin > 0 && (
                <span className="chat-unread">{c.unreadByAdmin}</span>
              )}
            </button>
          ))}
        </div>

        <div className="chat-panel">
          {selected ? (
            <>
              <div className="chat-panel-header">
                <div>
                  <strong>{selected.userName}</strong>
                  {selected.orderId && (
                    <small className="chat-order-ref"> · Pedido #{selected.orderId.slice(-6)}</small>
                  )}
                </div>
                <span className={`status-pill status-${selected.status}`}>{selected.status}</span>
              </div>
              <ChatBox
                messages={messages}
                input={input}
                onInputChange={setInput}
                onSend={handleSend}
                mySender="admin"
                placeholder="Responder al cliente..."
                quickReplies={ADMIN_QUICK_REPLIES}
                onQuickReply={handleQuickReply}
              />
            </>
          ) : (
            <div className="chat-empty-panel">
              <span>💬</span>
              <p>Selecciona una conversación</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
