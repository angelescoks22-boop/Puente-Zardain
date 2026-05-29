import { io, Socket } from 'socket.io-client';
import { getToken, API_BASE } from './client';

export type ChatMessage = {
  id: string;
  conversationId: string;
  sender: 'user' | 'admin' | 'system';
  message: string;
  read: boolean;
  isAutomated?: boolean;
  createdAt: string;
};

export type Conversation = {
  id: string;
  userId: string;
  userName: string;
  orderId?: string;
  status: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadByAdmin: number;
  unreadByUser: number;
  createdAt: string;
};

export async function getMyConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/chat/my`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Error al cargar conversaciones');
  return res.json();
}

export async function getUnreadChatCount(): Promise<{ total: number }> {
  const res = await fetch(`${API_BASE}/chat/unread`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Error al cargar no leídos');
  return res.json();
}

export async function getChatByOrder(orderId: string) {
  const res = await fetch(`${API_BASE}/chat/order/${orderId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Error al cargar chat del pedido');
  return res.json() as Promise<{ conversation: Conversation; messages: ChatMessage[] }>;
}

export async function startConversation(orderId?: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/chat/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ orderId }),
  });
  if (!res.ok) throw new Error('Error al iniciar chat');
  return res.json();
}

export async function getConversation(conversationId: string) {
  const res = await fetch(`${API_BASE}/chat/${conversationId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Error al cargar chat');
  return res.json() as Promise<{ conversation: Conversation; messages: ChatMessage[] }>;
}

export async function getAllConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/chat/conversations`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Error al cargar conversaciones');
  return res.json();
}

export async function sendMessageRest(conversationId: string, message: string): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ conversationId, message }),
  });
  if (!res.ok) throw new Error('Error al enviar mensaje');
  return res.json();
}

/** @deprecated Usar getChatSocket() de chatSocket.ts */
export function connectChatSocket(): Socket {
  const token = getToken();
  return io(window.location.origin, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
}
