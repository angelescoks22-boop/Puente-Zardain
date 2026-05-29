import { useEffect, useState, useCallback } from 'react';

import { getChatByOrder, type ChatMessage } from '../../api/chat';

import { appendUnique, useChat } from '../../hooks/useChatSocket';

import { useChatStore } from '../../store/chatStore';

import { useAppStore } from '../../store/appStore';

import { useOrderStore } from '../../store/orderStore';

import { ChatBox } from './ChatBox';

import { Card } from '../ui/Card';



const ORDER_QUICK_REPLIES = [

  '¿Cuánto tarda mi pedido?',

  '¿Está listo?',

  '¿Puedo cambiar algo?',

];



type Props = {

  orderId: string;

  compact?: boolean;

};



export function OrderChatPanel({ orderId, compact }: Props) {

  const [conversationId, setConversationId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [input, setInput] = useState('');

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);

  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  const refreshUnread = useChatStore((s) => s.refreshUnread);

  const addNotification = useAppStore((s) => s.addNotification);

  const systemMessages = useAppStore((s) => s.getSystemChatMessages(orderId));

  const order = useOrderStore((s) => s.orders.find((o) => o.id === orderId) ?? s.activeOrder);



  const handleNewMessage = useCallback((msg: ChatMessage) => {

    setMessages((prev) => appendUnique(prev, msg));

    if (msg.sender === 'admin') {

      addNotification('Mensaje del restaurante', msg.message.slice(0, 80));

    }

  }, [addNotification]);



  const { sendMessage } = useChat(conversationId, handleNewMessage);



  useEffect(() => {

    setLoading(true);

    getChatByOrder(orderId)

      .then((data) => {

        setConversationId(data.conversation.id);

        setMessages(data.messages);

        setActiveConversation(data.conversation.id);

        void refreshUnread();

      })

      .catch(() => {})

      .finally(() => setLoading(false));



    return () => {

      setActiveConversation(null);

      void refreshUnread();

    };

  }, [orderId, setActiveConversation, refreshUnread]);



  const handleSend = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!input.trim() || !conversationId || sending) return;

    const text = input.trim();

    setInput('');

    setSending(true);

    await sendMessage(text);

    setSending(false);

  };



  const handleQuickReply = async (text: string) => {

    if (!conversationId || sending) return;

    setSending(true);

    await sendMessage(text);

    setSending(false);

  };



  const quickReplies =

    order && !['delivered', 'cancelled'].includes(order.status) ? ORDER_QUICK_REPLIES : undefined;



  return (

    <Card className={`order-chat-panel ${compact ? 'compact' : ''}`}>

      <h3>💬 Chat del pedido</h3>

      <p className="hint">Respuestas automáticas según el estado · también te atiende el local</p>

      <ChatBox

        messages={messages}

        systemMessages={systemMessages}

        input={input}

        onInputChange={setInput}

        onSend={handleSend}

        mySender="user"

        loading={loading}

        emptyHint="¿Duda sobre tu pedido? Escríbenos o usa una respuesta rápida."

        quickReplies={quickReplies}

        onQuickReply={handleQuickReply}

      />

    </Card>

  );

}

