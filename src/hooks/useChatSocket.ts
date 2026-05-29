import { useEffect, useRef, useCallback } from 'react';
import type { ChatMessage } from '../api/chat';
import { sendMessageRest } from '../api/chat';
import { joinConversation, onChatMessage } from '../api/chatSocket';

export function appendUnique(prev: ChatMessage[], msg: ChatMessage) {
  if (prev.some((m) => m.id === msg.id)) return prev;
  return [...prev, msg].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function useChat(conversationId: string | null, onMessage?: (msg: ChatMessage) => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const convRef = useRef(conversationId);
  convRef.current = conversationId;

  useEffect(() => {
    joinConversation(conversationId);
  }, [conversationId]);

  useEffect(() => {
    return onChatMessage((msg) => {
      // Recibir mensajes de la conversación activa
      if (msg.conversationId === convRef.current) {
        onMessageRef.current?.(msg);
      }
    });
  }, []);

  const sendMessage = useCallback(async (text: string): Promise<ChatMessage | null> => {
    if (!convRef.current || !text.trim()) return null;

    try {
      // REST es la fuente de verdad; el servidor emite receiveMessage tras guardar
      const saved = await sendMessageRest(convRef.current, text.trim());
      onMessageRef.current?.(saved);
      return saved;
    } catch (err) {
      console.error('[Chat] Error al enviar:', err);
      return null;
    }
  }, []);

  return { sendMessage };
}
