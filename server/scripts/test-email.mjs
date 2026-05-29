import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const to = process.argv[2] || process.env.SMTP_USER || process.env.EMAIL_USER;

const smtpHost = process.env.SMTP_HOST;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const from =
  process.env.EMAIL_FROM ||
  `"Puente Zardain" <${smtpUser || emailUser}>`;

let transporter;
let label;

if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
  label = `SMTP ${smtpHost}`;
} else if (emailUser && emailPass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: emailUser, pass: emailPass },
  });
  label = `Gmail ${emailUser}`;
} else {
  console.error('❌ Configura SMTP (Brevo) o Gmail en server/.env');
  console.error('   Brevo gratis: SMTP_HOST=smtp-relay.brevo.com + SMTP_USER + SMTP_PASS');
  process.exit(1);
}

console.log(`📧 Probando ${label} → ${to}...`);

try {
  await transporter.verify();
  console.log('✅ Conexión SMTP OK');

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'Prueba Puente Zardain — OTP',
    text: 'Tu código de prueba es: 123456\n\nSi recibes esto, el email funciona.',
    html: '<p>Tu código de prueba es: <strong>123456</strong></p><p>Si recibes esto, el email funciona.</p>',
  });

  console.log('✅ Email enviado:', info.messageId);
} catch (err) {
  console.error('❌ Error SMTP:', err.message);
  if (/Invalid login|535|534/.test(String(err.message))) {
    console.error('\n💡 Gmail no acepta contraseña normal. Usa Brevo (gratis):');
    console.error('   1. Regístrate en https://www.brevo.com');
    console.error('   2. SMTP → genera clave SMTP');
    console.error('   3. Añade SMTP_HOST, SMTP_USER, SMTP_PASS en server/.env');
  }
  process.exit(1);
}
