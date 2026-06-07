-- ============================================================
-- CateringFlow – Full Database Schema
-- Apply in Supabase SQL Editor or via: supabase db push
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TENANTS (catering companies)
-- ============================================================
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILES (users, linked to auth.users)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'admin_catering' CHECK (role IN ('admin_catering', 'cliente_final')),
  full_name   TEXT,
  email       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MENUS
-- ============================================================
CREATE TABLE menus (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  price_per_person NUMERIC(10, 2) NOT NULL DEFAULT 0,
  min_guests       INTEGER NOT NULL DEFAULT 10,
  max_guests       INTEGER NOT NULL DEFAULT 500,
  cover_url        TEXT,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MENU ITEMS
-- ============================================================
CREATE TABLE menu_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id     UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'principal' CHECK (
    category IN ('entrante', 'principal', 'postre', 'bebida', 'extra')
  ),
  allergens   TEXT[] NOT NULL DEFAULT '{}',
  photo_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  date        DATE NOT NULL,
  start_time  TIME,
  end_time    TIME,
  location    TEXT,
  max_guests  INTEGER,
  status      TEXT NOT NULL DEFAULT 'available' CHECK (
    status IN ('available', 'reserved', 'cancelled', 'completed')
  ),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id           UUID REFERENCES events(id) ON DELETE SET NULL,
  menu_id            UUID NOT NULL REFERENCES menus(id),
  -- Client info (captured on form, not necessarily a registered user)
  client_name        TEXT NOT NULL,
  client_email       TEXT NOT NULL,
  client_phone       TEXT,
  client_profile_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Booking details
  guests             INTEGER NOT NULL DEFAULT 1,
  extras             JSONB NOT NULL DEFAULT '[]',
  total_amount       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  deposit_amount     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  -- Allergen declarations from client
  client_allergens   TEXT[] NOT NULL DEFAULT '{}',
  notes              TEXT,
  -- Status
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'cancelled', 'paid_full')
  ),
  event_date         DATE,
  event_time         TIME,
  location           TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id         UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  stripe_session_id  TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount             NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'eur',
  payment_type       TEXT NOT NULL CHECK (payment_type IN ('deposit', 'final')),
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'refunded', 'failed')
  ),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tenants','profiles','menus','menu_items','events','bookings','payments']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGN-UP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's tenant_id
CREATE OR REPLACE FUNCTION my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- tenants: members can read their own tenant
CREATE POLICY "tenant_read" ON tenants
  FOR SELECT USING (id = my_tenant_id());

CREATE POLICY "tenant_update" ON tenants
  FOR UPDATE USING (id = my_tenant_id());

-- profiles: users manage own profile; admins see all in tenant
CREATE POLICY "profile_select_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR tenant_id = my_tenant_id());

CREATE POLICY "profile_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profile_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- menus: admin sees own tenant; public read for active menus via slug (handled in API)
CREATE POLICY "menus_tenant" ON menus
  FOR ALL USING (tenant_id = my_tenant_id());

-- menu_items: scoped to tenant
CREATE POLICY "menu_items_tenant" ON menu_items
  FOR ALL USING (tenant_id = my_tenant_id());

-- events: scoped to tenant
CREATE POLICY "events_tenant" ON events
  FOR ALL USING (tenant_id = my_tenant_id());

-- bookings: admin sees all in tenant; client sees own
CREATE POLICY "bookings_admin" ON bookings
  FOR ALL USING (tenant_id = my_tenant_id());

-- payments: scoped to tenant
CREATE POLICY "payments_tenant" ON payments
  FOR ALL USING (tenant_id = my_tenant_id());

-- ============================================================
-- STORAGE BUCKET for menu item photos
-- ============================================================
-- Run this in the Supabase Storage section or via CLI:
-- supabase storage create menu-photos --public
-- (already handled below as SQL for reference)

INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-photos', 'menu-photos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "anyone_can_read_menu_photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-photos');

CREATE POLICY "tenant_members_can_upload_menu_photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'menu-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "tenant_members_can_delete_menu_photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'menu-photos'
    AND auth.role() = 'authenticated'
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_menus_tenant ON menus(tenant_id);
CREATE INDEX idx_menu_items_menu ON menu_items(menu_id);
CREATE INDEX idx_menu_items_tenant ON menu_items(tenant_id);
CREATE INDEX idx_events_tenant_date ON events(tenant_id, date);
CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_bookings_status ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_stripe_session ON payments(stripe_session_id);
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_tenants_slug ON tenants(slug);
