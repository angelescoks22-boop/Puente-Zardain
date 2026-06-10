import type { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import * as usersRepo from '../db/users.js';
import * as conversationsRepo from '../db/conversations.js';
import { saveMessage } from '../services/chat.service.js';
import { tryAutoReplyToUserMessage } from '../services/autoChat.service.js';
import { isTokenRevoked } from '../middleware/auth.js';

type SocketUser = { id: string; role: 'client' | 'admin'; name: string };

async function authenticateSocket(token?: string): Promise<SocketUser | null> {
  if (!token) return null;
  try {
    if (await isTokenRevoked(token)) return null;
    const decoded = jwt.verify(token, env.jwtSecret) as { id: string; role: string };
    const user = await usersRepo.findById(decoded.id);
    if (!user) return null;
    if (user.isBlocked || user.clientStatus === 'blocked') return null;
    return { id: user.id, role: user.role, name: user.name };
  } catch {
    return null;
  }
}

export function setupChatSocket(io: Server) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const user = await authenticateSocket(token);
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser | null;
    if (user) {
      console.log(`💬 Socket conectado: ${user.name} (${user.role})`);
      socket.join(`user:${user.id}`);
      if (user.role === 'admin') {
        socket.join('admin:chat');
        socket.join('admin:dashboard');
      }
    } else {
      console.log('💬 Socket visitante (broadcasts públicos)');
    }

    socket.on('join_conversation', async (conversationId: string) => {
      if (!user) return;
      const conversation = await conversationsRepo.findById(conversationId);
      if (!conversation) return;
      const isOwner = conversation.userId === user.id;
      if (!isOwner && user.role !== 'admin') return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('send_message', async (payload: { conversationId: string; message: string }) => {
      if (!user) return;
      const { conversationId, message } = payload;
      if (!conversationId || !message?.trim()) return;

      const conversation = await conversationsRepo.findById(conversationId);
      if (!conversation) return;
      const isOwner = conversation.userId === user.id;
      if (!isOwner && user.role !== 'admin') return;

      const sender = user.role === 'admin' ? 'admin' : 'user';
      try {
        await saveMessage(conversationId, sender, message.trim());
        if (sender === 'user') {
          void tryAutoReplyToUserMessage(conversationId, message.trim());
        }
      } catch (err) {
        console.error('[Chat socket] Error al guardar mensaje:', err);
      }
    });

    socket.on('disconnect', () => {
      if (user) console.log(`💬 Socket desconectado: ${user.name}`);
    });
  });
}
