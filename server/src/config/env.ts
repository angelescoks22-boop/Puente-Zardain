import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 5000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  isDev: process.env.NODE_ENV !== 'production',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@zardain.com',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin123',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
  emailPass: process.env.EMAIL_PASS ?? '',
  emailUser: process.env.EMAIL_USER ?? '',
  /** SMTP genérico (recomendado: Brevo gratis). Si está definido, tiene prioridad sobre Gmail. */
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  emailFrom: process.env.EMAIL_FROM ?? '',
  /** API REST de Brevo (más fiable que SMTP en Render). Crear en Brevo → SMTP & API → API Keys */
  brevoApiKey: process.env.BREVO_API_KEY ?? '',
  deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM ?? 5),
  restaurantLat: Number(process.env.RESTAURANT_LAT ?? 40.3019),
  restaurantLng: Number(process.env.RESTAURANT_LNG ?? -3.8736),
};

/** Orígenes permitidos (CORS). CLIENT_URL puede ser lista separada por comas. */
export function getClientOrigins(): string[] {
  return env.clientUrl
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
