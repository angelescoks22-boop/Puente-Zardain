import dotenv from 'dotenv';
dotenv.config();

const key = process.env.BREVO_API_KEY;
if (!key) {
  console.error('❌ BREVO_API_KEY no está en server/.env');
  process.exit(1);
}

const from = process.env.EMAIL_FROM || 'Puente Zardain <puentedezardain9@gmail.com>';
const match = from.match(/^"?([^"<]+)"?\s*<([^>]+)>$/);
const sender = match
  ? { name: match[1].trim(), email: match[2].trim() }
  : { name: 'Puente Zardain', email: 'puentedezardain9@gmail.com' };

const to = process.argv[2] || sender.email;
console.log(`📧 Probando Brevo API → ${to}...`);

const res = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: {
    'api-key': key,
    'Content-Type': 'application/json',
    accept: 'application/json',
  },
  body: JSON.stringify({
    sender,
    to: [{ email: to }],
    subject: 'Test Puente Zardain — API OK',
    textContent: 'Si ves esto, la API de Brevo funciona. Los códigos OTP deberían llegar bien.',
  }),
});

if (res.status === 201) {
  const data = await res.json();
  console.log('✅ API Brevo OK — email enviado', data.messageId ?? '');
} else {
  console.error('❌ Error', res.status, await res.text());
  process.exit(1);
}
