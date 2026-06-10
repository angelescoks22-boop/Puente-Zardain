-- Puente Zardain — PostgreSQL schema (Supabase)
-- Run in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'client',
  address text,
  addresses jsonb NOT NULL DEFAULT '[]'::jsonb,
  zardas int NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'hierro',
  level_progress int NOT NULL DEFAULT 0,
  order_count int NOT NULL DEFAULT 0,
  streak int NOT NULL DEFAULT 0,
  last_order_date timestamptz,
  is_blocked boolean NOT NULL DEFAULT false,
  no_show_count int NOT NULL DEFAULT 0,
  phone_verified boolean NOT NULL DEFAULT false,
  client_status text NOT NULL DEFAULT 'normal',
  favorite_product_id uuid,
  profile_avatar text DEFAULT '😊',
  profile_color text DEFAULT '#e85d04',
  profile_tagline text DEFAULT '',
  profile_frame text DEFAULT 'none',
  birthday date,
  birthday_reward_claimed_year int,
  birthday_free_product_pending boolean NOT NULL DEFAULT false,
  password_user_set boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pending_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  phone text,
  name text,
  password_hash text,
  password_user_set boolean NOT NULL DEFAULT false,
  otp text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  pending_address jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL,
  category text NOT NULL,
  image text NOT NULL DEFAULT '🍔',
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  popular boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_order_amount numeric NOT NULL DEFAULT 15,
  delivery_area text NOT NULL DEFAULT 'Arroyomolinos',
  orders_open boolean NOT NULL DEFAULT true,
  business_status text NOT NULL DEFAULT 'open',
  prep_time_minutes int NOT NULL DEFAULT 15,
  schedule jsonb NOT NULL DEFAULT '{"openTime":"12:00","closeTime":"23:30","autoSchedule":false}'::jsonb,
  auto_rules jsonb NOT NULL DEFAULT '{"saturatedOrderThreshold":8,"prepTimeBoostWhenSaturated":5,"autoSaturateEnabled":true}'::jsonb,
  promo jsonb,
  automation jsonb NOT NULL DEFAULT '{"enabled":true,"autoPromoEnabled":true,"slowDayRatio":0.6,"busyDayRatio":1.3,"autoBonusZardas":false,"autoBonusAmount":10,"chatAutoEnabled":true,"chatAutoReplyEnabled":true,"dailyReportEnabled":true,"cleanupChatDays":30,"cleanupLogDays":60}'::jsonb,
  menu_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL,
  type text NOT NULL,
  payment_method text NOT NULL,
  cash_paid_amount numeric,
  cash_change numeric,
  rewards_granted boolean NOT NULL DEFAULT false,
  address text,
  delivery_address jsonb,
  delivery_lat numeric,
  delivery_lng numeric,
  status text NOT NULL DEFAULT 'pending',
  queue_position int NOT NULL DEFAULT 0,
  estimated_time_minutes int,
  completed_at timestamptz,
  picked_up boolean NOT NULL DEFAULT false,
  internal_notes text DEFAULT '',
  cancel_reason text,
  ticket_snapshot jsonb,
  ticket_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT true,
  admin_response text,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  zardas_cost int NOT NULL,
  icon text NOT NULL DEFAULT '🎁',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  last_message text,
  last_message_at timestamptz,
  unread_by_admin int NOT NULL DEFAULT 0,
  unread_by_user int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  is_automated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS order_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  changed_by_id uuid,
  changed_by_name text NOT NULL,
  changed_by_role text NOT NULL DEFAULT 'admin',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens (expires_at);

CREATE TABLE IF NOT EXISTS user_favorite_products (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS user_favorite_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_orders_user ON user_favorite_orders (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  reward_name text NOT NULL,
  zardas_cost int NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON user_reward_redemptions (user_id, created_at DESC);
