import { io, Socket } from 'socket.io-client';
import { getToken } from './client';
import { getSocketOrigin } from '../config/api';
import type { ChatMessage } from './chat';

let sharedSocket: Socket | null = null;
let boundTokenKey: string | null = null;
let currentConversationId: string | null = null;

type MessageHandler = (msg: ChatMessage) => void;
type ConversationHandler = (conv: unknown) => void;
type SettingsHandler = (payload: Record<string, unknown>) => void;
type NotificationHandler = (payload: {
  conversationId: string;
  orderId?: string;
  unreadByUser: number;
  preview: string;
}) => void;

const messageHandlers = new Set<MessageHandler>();
const conversationHandlers = new Set<ConversationHandler>();
const notificationHandlers = new Set<NotificationHandler>();
const settingsHandlers = new Set<SettingsHandler>();

function setupSocket(socket: Socket) {
  socket.off('receiveMessage');
  socket.off('conversation_updated');
  socket.off('connect');
  socket.off('connect_error');
  socket.off('chat_notification');
  socket.off('settings_update');

  socket.on('receiveMessage', (msg: ChatMessage) => {
    messageHandlers.forEach((h) => h(msg));
  });

  socket.on('conversation_updated', (conv: unknown) => {
    conversationHandlers.forEach((h) => h(conv));
  });

  socket.on('chat_notification', (payload: {
    conversationId: string;
    orderId?: string;
    unreadByUser: number;
    preview: string;
  }) => {
    notificationHandlers.forEach((h) => h(payload));
  });

  socket.on('settings_update', (payload: Record<string, unknown>) => {
    settingsHandlers.forEach((h) => h(payload));
  });

  socket.on('connect', () => {
    if (currentConversationId) {
      socket.emit('join_conversation', currentConversationId);
    }
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Error de conexión:', err.message);
  });
}

function createSocket(token: string | null): Socket {
  const origin = getSocketOrigin() || window.location.origin;
  const socket = io(origin, {
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
  });
  setupSocket(socket);
  return socket;
}

/** Socket compartido — conecta siempre (visitantes reciben settings_update) */
export function ensureAppSocket(): Socket {
  const token = getToken();
  const tokenKey = token ?? '__guest__';

  if (sharedSocket && boundTokenKey !== tokenKey) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }

  if (!sharedSocket) {
    boundTokenKey = tokenKey;
    sharedSocket = createSocket(token);
  } else if (token) {
    sharedSocket.auth = { token };
    if (!sharedSocket.connected) sharedSocket.connect();
  }

  return sharedSocket;
}

/** Para chat/pedidos — requiere login */
export function getChatSocket(): Socket | null {
  if (!getToken()) return null;
  return ensureAppSocket();
}

export function onSettingsUpdate(handler: SettingsHandler) {
  settingsHandlers.add(handler);
  ensureAppSocket();
  return () => settingsHandlers.delete(handler);
}

export function joinConversation(conversationId: string | null) {
  currentConversationId = conversationId;
  const socket = getChatSocket();
  if (!socket) return;

  const doJoin = () => {
    if (conversationId) socket.emit('join_conversation', conversationId);
  };
  if (socket.connected) doJoin();
  else socket.once('connect', doJoin);
}

export function onChatMessage(handler: MessageHandler) {
  messageHandlers.add(handler);
  getChatSocket();
  return () => {
    messageHandlers.delete(handler);
  };
}

export function onConversationUpdate(handler: ConversationHandler) {
  conversationHandlers.add(handler);
  getChatSocket();
  return () => {
    conversationHandlers.delete(handler);
  };
}

export function onChatNotification(handler: NotificationHandler) {
  notificationHandlers.add(handler);
  getChatSocket();
  return () => {
    notificationHandlers.delete(handler);
  };
}

export function reconnectChatSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    boundTokenKey = null;
  }
  ensureAppSocket();
}

export function disconnectChatSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    boundTokenKey = null;
    currentConversationId = null;
  }
}
