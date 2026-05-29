import type { IOrder } from '../models/Order.js';
import * as ordersRepo from '../db/orders.js';
import * as settingsRepo from '../db/settings.js';
import * as conversationsRepo from '../db/conversations.js';
import { getEffectivePrepMinutes, getActiveOrderCount } from './adminJobs.service.js';
import { findOrCreateConversation, saveSystemMessage } from './chat.service.js';

const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Hemos recibido tu pedido 📦 En breve lo confirmamos.',
  accepted: 'Tu pedido ha sido confirmado ✅',
  preparing: 'Tu pedido está en cocina 🍳',
  ready: '¡Tu pedido está listo! ✅ Pasa a recogerlo o espera al repartidor.',
  on_the_way: 'Tu pedido va en camino 🚗',
  delivered: 'Pedido entregado. ¡Buen provecho! 🎉',
  cancelled: 'Tu pedido ha sido cancelado. Si tienes dudas, escríbenos.',
};

type KeywordRule = {
  test: RegExp;
  reply: string | ((ctx: { order?: IOrder; mins?: number }) => string);
};

const KEYWORD_RULES: KeywordRule[] = [
  {
    test: /^(hola|buenas|hey|hi)\b/i,
    reply: '¡Hola! 👋 Soy el asistente de Puente Zardain. ¿En qué puedo ayudarte?',
  },
  {
    test: /(cuanto|cuánto|minutos|tiempo|espera|tarda|demora)/i,
    reply: ({ mins }) =>
      mins !== undefined
        ? `Quedan aproximadamente ${mins} minutos ⏱️`
        : 'Quedan unos 10–15 minutos aproximadamente ⏱️',
  },
  {
    test: /(listo|preparado|ya está)/i,
    reply: ({ order }) => {
      if (order?.status === 'ready') return '¡Sí! Tu pedido ya está listo ✅';
      if (order?.status === 'preparing') return 'Aún lo estamos preparando 🍳 Te avisamos en cuanto esté listo.';
      return 'Estamos trabajando en tu pedido. Te avisamos en cuanto esté listo 👍';
    },
  },
  {
    test: /(sin problema|ok|vale|perfecto|gracias|genial)/i,
    reply: 'Sí, sin problema 👍',
  },
  {
    test: /(cancelar|anular)/i,
    reply: 'Si necesitas cancelar, escríbenos el motivo. Solo podemos cancelar si aún no está en cocina.',
  },
  {
    test: /(direccion|dirección|donde|dónde|reparto)/i,
    reply: 'Entregamos en Arroyomolinos 📍 Si tu dirección está confirmada en el pedido, el repartidor irá allí.',
  },
  {
    test: /(quitar|sin |ingrediente|alergi|celiac|personaliz)/i,
    reply: 'Sí, puedes quitar ingredientes 👍 Personaliza tu producto antes de añadirlo al carrito.',
  },
  {
    test: /(recomienda|recomend|qué pedir|que pedir|no sé|no se)/i,
    reply: 'Ve a Inicio o Carta y pulsa «No sé qué pedir» — te sugerimos según lo que más gusta 🍔',
  },
  {
    test: /(hablar|persona|humano|encargado|queja seria|reclamaci)/i,
    reply: '__ESCALATE__',
  },
];

async function isAutoChatEnabled() {
  const settings = await settingsRepo.getSingleton();
  return settings?.automation?.enabled !== false && settings?.automation?.chatAutoEnabled !== false;
}

async function getEstimatedMinutes() {
  const settings = await settingsRepo.getOrCreate();
  const activeCount = await getActiveOrderCount();
  return getEffectivePrepMinutes(settings, activeCount);
}

export async function sendAutoChatForOrderStatus(orderId: string, status: string) {
  if (!(await isAutoChatEnabled())) return null;

  const text = STATUS_MESSAGES[status];
  if (!text) return null;

  const order = await ordersRepo.findById(orderId);
  if (!order) return null;

  const conversation = await findOrCreateConversation(
    order.userId,
    order.clientName,
    orderId,
  );

  const msg = await saveSystemMessage(conversation.id, text);

  if (status === 'preparing') {
    const mins = await getEstimatedMinutes();
    await saveSystemMessage(
      conversation.id,
      `Quedan aproximadamente ${mins} minutos ⏱️`,
    );
  }

  return msg;
}

export async function sendWelcomeChat(orderId: string, userId: string, userName: string) {
  if (!(await isAutoChatEnabled())) return null;

  const conversation = await findOrCreateConversation(userId, userName, orderId);
  const mins = await getEstimatedMinutes();

  await saveSystemMessage(
    conversation.id,
    `¡Gracias por tu pedido, ${userName.split(' ')[0]}! 🎉 Tiempo estimado: ~${mins} min.`,
  );
  return conversation;
}

export async function tryAutoReplyToUserMessage(conversationId: string, userMessage: string) {
  const settings = await settingsRepo.getSingleton();
  if (settings?.automation?.enabled === false || settings?.automation?.chatAutoReplyEnabled === false) {
    return null;
  }

  const conversation = await conversationsRepo.findById(conversationId);
  if (!conversation) return null;

  let order: IOrder | null = null;
  if (conversation.orderId) {
    order = await ordersRepo.findById(conversation.orderId);
  }

  const mins = await getEstimatedMinutes();
  const text = userMessage.trim();

  for (const rule of KEYWORD_RULES) {
    if (rule.test.test(text)) {
      const reply = typeof rule.reply === 'function' ? rule.reply({ order: order ?? undefined, mins }) : rule.reply;
      if (reply === '__ESCALATE__') {
        await saveSystemMessage(
          conversationId,
          'Te paso con el equipo 👤 En breve te atienden personalmente.',
        );
        return null;
      }
      return saveSystemMessage(conversationId, reply);
    }
  }

  if (order && ['pending', 'accepted', 'preparing'].includes(order.status)) {
    return saveSystemMessage(
      conversationId,
      'Recibido 👍 Estamos gestionando tu pedido. Si necesitas algo urgente, un miembro del equipo te responderá pronto.',
    );
  }

  return null;
}
