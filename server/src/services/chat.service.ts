import type { Server } from 'socket.io';
import type { IConversation } from '../models/Conversation.js';
import type { IMessage } from '../models/Message.js';
import * as conversationsRepo from '../db/conversations.js';
import * as messagesRepo from '../db/messages.js';
import * as ordersRepo from '../db/orders.js';
import { AppError } from '../utils/logger.js';

export type FormattedMessage = {
  id: string;
  conversationId: string;
  sender: 'user' | 'admin' | 'system';
  message: string;
  read: boolean;
  isAutomated?: boolean;
  createdAt: string;
};

export type FormattedConversation = {
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

let io: Server | null = null;

export function setChatIo(server: Server) {
  io = server;
}

export function formatMessage(m: IMessage): FormattedMessage {
  return {
    id: m.id,
    conversationId: m.conversationId,
    sender: m.sender,
    message: m.message,
    read: m.read,
    isAutomated: m.isAutomated,
    createdAt: m.createdAt.toISOString(),
  };
}

export function formatConversation(c: IConversation): FormattedConversation {
  return {
    id: c.id,
    userId: c.userId,
    userName: c.userName,
    orderId: c.orderId,
    status: c.status,
    lastMessage: c.lastMessage,
    lastMessageAt: c.lastMessageAt?.toISOString(),
    unreadByAdmin: c.unreadByAdmin,
    unreadByUser: c.unreadByUser,
    createdAt: c.createdAt.toISOString(),
  };
}

export function emitMessage(message: FormattedMessage, conversation: FormattedConversation) {
  if (!io) return;

  io.to(`conversation:${message.conversationId}`).emit('receiveMessage', message);

  if (message.sender === 'admin' || message.sender === 'system') {
    io.to(`user:${conversation.userId}`).emit('receiveMessage', message);
  }

  io.to('admin:chat').emit('conversation_updated', conversation);

  if (message.sender === 'admin' || message.sender === 'system') {
    io.to(`user:${conversation.userId}`).emit('chat_notification', {
      conversationId: message.conversationId,
      orderId: conversation.orderId,
      unreadByUser: conversation.unreadByUser,
      preview: message.message,
    });
  }
}

export async function saveMessage(
  conversationId: string,
  sender: 'user' | 'admin',
  text: string,
): Promise<FormattedMessage> {
  const conversation = await conversationsRepo.findById(conversationId);
  if (!conversation) throw new Error('Conversación no encontrada');

  const msg = await messagesRepo.create({
    conversationId,
    sender,
    message: text.trim(),
    read: false,
    isAutomated: false,
  });

  conversation.lastMessage = text.trim();
  conversation.lastMessageAt = new Date();
  if (sender === 'user') conversation.unreadByAdmin += 1;
  else conversation.unreadByUser += 1;
  await conversationsRepo.save(conversation);

  const payload = formatMessage(msg);
  const formatted = formatConversation(conversation);
  emitMessage(payload, formatted);
  return payload;
}

export async function saveSystemMessage(conversationId: string, text: string): Promise<FormattedMessage> {
  const conversation = await conversationsRepo.findById(conversationId);
  if (!conversation) throw new Error('Conversación no encontrada');

  const msg = await messagesRepo.create({
    conversationId,
    sender: 'system',
    message: text.trim(),
    read: false,
    isAutomated: true,
  });

  conversation.lastMessage = text.trim();
  conversation.lastMessageAt = new Date();
  conversation.unreadByUser += 1;
  await conversationsRepo.save(conversation);

  const payload = formatMessage(msg);
  const formatted = formatConversation(conversation);
  emitMessage(payload, formatted);
  return payload;
}

export async function markAsRead(conversationId: string, reader: 'user' | 'admin') {
  const conversation = await conversationsRepo.findById(conversationId);
  if (!conversation) return;

  if (reader === 'admin') {
    conversation.unreadByAdmin = 0;
    await messagesRepo.markReadForConversation(conversationId, ['user']);
  } else {
    conversation.unreadByUser = 0;
    await messagesRepo.markReadForConversation(conversationId, ['admin', 'system']);
  }
  await conversationsRepo.save(conversation);
}

export async function findOrCreateConversation(
  userId: string,
  userName: string,
  orderId?: string,
) {
  if (orderId) {
    const order = await ordersRepo.findById(orderId);
    if (!order) throw new AppError('Pedido no encontrado', 404);
    if (order.userId !== userId) throw new AppError('Acceso denegado', 403);

    let conversation = await conversationsRepo.findByOrderId(orderId);
    if (!conversation) {
      conversation = await conversationsRepo.create({
        userId,
        userName,
        orderId,
        status: 'active',
      });
    } else if (conversation.userId !== userId) {
      throw new AppError('Acceso denegado', 403);
    }
    return conversation;
  }

  let conversation = await conversationsRepo.findGeneralForUser(userId);

  if (!conversation) {
    conversation = await conversationsRepo.create({
      userId,
      userName,
      status: 'active',
    });
  } else if (conversation.status === 'open') {
    conversation.status = 'active';
    await conversationsRepo.save(conversation);
  }

  return conversation;
}
