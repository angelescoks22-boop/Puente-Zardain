import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { retry } from '../utils/retry.js';

let transporter: nodemailer.Transporter | null = null;

function getFromAddress(): string {
  if (env.emailFrom) return env.emailFrom;
  const addr = env.smtpUser || env.emailUser;
  return `"Puente Zardain" <${addr}>`;
}

function getTransporter() {
  if (transporter) return transporter;

  if (env.smtpHost && env.smtpUser && env.smtpPass) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
    return transporter;
  }

  if (env.emailUser && env.emailPass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.emailUser,
        pass: env.emailPass,
      },
    });
    return transporter;
  }

  return null;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    (env.smtpHost && env.smtpUser && env.smtpPass) ||
    (env.emailUser && env.emailPass),
  );
}

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail({ to, subject, text, html }: SendEmailInput): Promise<void> {
  const mail = getTransporter();

  if (mail) {
    await mail.sendMail({
      from: getFromAddress(),
      to,
      subject,
      text,
      html,
    });
    return;
  }

  if (env.isDev) {
    console.info(`[EMAIL dev] To: ${to}\nSubject: ${subject}\n${text}`);
    return;
  }

  throw new Error('Email no configurado. Añade SMTP (Brevo) o Gmail en server/.env');
}

export async function sendEmailWithRetry(input: SendEmailInput): Promise<void> {
  await retry(() => sendEmail(input));
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await sendEmailWithRetry({
    to,
    subject: 'Tu código Puente Zardain',
    text: `Tu código de verificación es: ${code}\n\nVálido 5 minutos. No lo compartas con nadie.`,
    html: `
      <div style="font-family:Segoe UI,sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <h2 style="color:#e85d04;margin:0 0 12px">🌉 Puente Zardain</h2>
        <p>Tu código de verificación es:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1a1a1a">${code}</p>
        <p style="color:#6b7280;font-size:14px">Válido 5 minutos. No lo compartas.</p>
      </div>
    `,
  });
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Recibido',
  accepted: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

function orderShortId(orderId: string) {
  return orderId.slice(-6).toUpperCase();
}

export async function sendOrderConfirmationEmail(
  to: string,
  order: { id: string; total: number; type: string; estimatedTimeMinutes?: number },
): Promise<void> {
  const shortId = orderShortId(order.id);
  const eta = order.estimatedTimeMinutes ? `\nTiempo estimado: ~${order.estimatedTimeMinutes} min` : '';
  const typeLabel = order.type === 'delivery' ? 'Domicilio' : 'Recogida en local';

  await sendEmailWithRetry({
    to,
    subject: `Pedido recibido ✅ #${shortId}`,
    text: `¡Gracias por tu pedido!\n\nPedido #${shortId}\nTotal: ${order.total.toFixed(2)}€\nTipo: ${typeLabel}${eta}\n\nTe avisaremos cuando avance.`,
    html: `
      <div style="font-family:Segoe UI,sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <h2 style="color:#e85d04">🌉 Pedido recibido ✅</h2>
        <p>Tu pedido <strong>#${shortId}</strong> ha sido recibido.</p>
        <p><strong>Total:</strong> ${order.total.toFixed(2)}€<br/>
        <strong>Tipo:</strong> ${typeLabel}${order.estimatedTimeMinutes ? `<br/><strong>Estimado:</strong> ~${order.estimatedTimeMinutes} min` : ''}</p>
        <p style="color:#6b7280;font-size:14px">Te avisaremos cuando avance.</p>
      </div>
    `,
  });
}

export async function sendOrderStatusEmail(
  to: string,
  order: { id: string; total: number; type: string },
  status: string,
): Promise<void> {
  const shortId = orderShortId(order.id);
  const label = STATUS_LABELS[status] ?? status;

  const subjects: Record<string, string> = {
    accepted: `Pedido confirmado ✅ #${shortId}`,
    preparing: `Tu pedido se está preparando 🍳 #${shortId}`,
    ready: `¡Pedido listo! 🍔 #${shortId}`,
    on_the_way: `Tu pedido va en camino 🛵 #${shortId}`,
    delivered: `Pedido entregado 🎉 #${shortId}`,
    cancelled: `Pedido cancelado #${shortId}`,
  };

  const messages: Record<string, string> = {
    accepted: 'Hemos confirmado tu pedido y pronto empezará a prepararse.',
    preparing: 'La cocina ya está con tu pedido.',
    ready: order.type === 'delivery'
      ? 'Tu pedido está listo. En breve saldrá hacia ti.'
      : 'Tu pedido está listo. Puedes pasarte a recogerlo.',
    on_the_way: 'El repartidor va camino de tu dirección.',
    delivered: 'Esperamos que lo disfrutes. ¡Gracias por confiar en Puente Zardain!',
    cancelled: 'Tu pedido ha sido cancelado. Si tienes dudas, contáctanos.',
  };

  const subject = subjects[status];
  const message = messages[status];
  if (!subject || !message) return;

  await sendEmailWithRetry({
    to,
    subject,
    text: `${message}\n\nPedido #${shortId}\nEstado: ${label}\nTotal: ${order.total.toFixed(2)}€`,
    html: `
      <div style="font-family:Segoe UI,sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <h2 style="color:#e85d04">${subject.replace(` #${shortId}`, '')}</h2>
        <p>${message}</p>
        <p><strong>Pedido:</strong> #${shortId}<br/>
        <strong>Estado:</strong> ${label}<br/>
        <strong>Total:</strong> ${order.total.toFixed(2)}€</p>
      </div>
    `,
  });
}
