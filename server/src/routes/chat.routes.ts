import { Router } from 'express';
import * as conversationsRepo from '../db/conversations.js';
import * as messagesRepo from '../db/messages.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import {
  formatConversation,
  formatMessage,
  findOrCreateConversation,
  markAsRead,
  saveMessage,
} from '../services/chat.service.js';
import { tryAutoReplyToUserMessage } from '../services/autoChat.service.js';
import { paramStr } from '../utils/params.js';

const router = Router();

router.post('/start', authenticate, async (req: AuthRequest, res) => {
  const { orderId } = req.body;
  const user = req.user!;
  const conversation = await findOrCreateConversation(
    user.id,
    user.name,
    orderId,
  );
  res.json(formatConversation(conversation));
});

router.get('/my', authenticate, async (req: AuthRequest, res) => {
  const conversations = await conversationsRepo.find({ userId: req.userId }, 'lastMessageDesc');
  res.json(conversations.map(formatConversation));
});

router.get('/unread', authenticate, async (req: AuthRequest, res) => {
  const conversations = await conversationsRepo.find({ userId: req.userId });
  const total = conversations.reduce((sum, c) => sum + (c.unreadByUser || 0), 0);
  res.json({ total, byOrder: conversations.map((c) => ({
    conversationId: c.id,
    orderId: c.orderId,
    unread: c.unreadByUser,
  })) });
});

router.get('/order/:orderId', authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const conversation = await findOrCreateConversation(
    user.id,
    user.name,
    paramStr(req.params.orderId),
  );
  const messages = await messagesRepo.findByConversationId(conversation.id);
  await markAsRead(conversation.id, 'user');
  res.json({
    conversation: formatConversation(conversation),
    messages: messages.map(formatMessage),
  });
});

router.get('/conversations', authenticate, requireAdmin, async (_req, res) => {
  const conversations = await conversationsRepo.find({}, 'lastMessageDesc');
  res.json(conversations.map(formatConversation));
});

router.get('/:conversationId', authenticate, async (req: AuthRequest, res) => {
  const conversation = await conversationsRepo.findById(paramStr(req.params.conversationId));
  if (!conversation) return res.status(404).json({ message: 'Conversación no encontrada' });

  const isOwner = conversation.userId === req.userId;
  const isAdmin = req.user?.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Acceso denegado' });

  const messages = await messagesRepo.findByConversationId(conversation.id);
  await markAsRead(conversation.id, isAdmin ? 'admin' : 'user');

  res.json({
    conversation: formatConversation(conversation),
    messages: messages.map(formatMessage),
  });
});

router.post('/message', authenticate, async (req: AuthRequest, res) => {
  const { conversationId, message } = req.body;
  if (!conversationId || !message?.trim()) {
    return res.status(400).json({ message: 'conversationId y message requeridos' });
  }

  const conversation = await conversationsRepo.findById(conversationId);
  if (!conversation) return res.status(404).json({ message: 'Conversación no encontrada' });

  const isOwner = conversation.userId === req.userId;
  const isAdmin = req.user?.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Acceso denegado' });

  const sender = isAdmin ? 'admin' : 'user';
  const payload = await saveMessage(conversationId, sender, message);

  if (sender === 'user') {
    void tryAutoReplyToUserMessage(conversationId, message);
  }

  res.status(201).json(payload);
});

export default router;
