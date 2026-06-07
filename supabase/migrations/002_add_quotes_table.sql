-- ============================================================
-- Migration: Add quotes table
-- ============================================================

CREATE TABLE IF NOT EXISTS quotes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Client info
  client_name      TEXT NOT NULL,
  client_email     TEXT NOT NULL,
  client_phone     TEXT,
  
  -- Event info
  event_type       TEXT,
  event_date       DATE NOT NULL,
  guests           INTEGER NOT NULL DEFAULT 1,
  location         TEXT,
  
  -- Menu snapshot
  menu_id          UUID REFERENCES menus(id) ON DELETE SET NULL,
  menu_name        TEXT,
  menu_items       JSONB NOT NULL DEFAULT '[]',
  
  -- Economics
  price_per_pax    NUMERIC(10, 2) NOT NULL DEFAULT 0,
  subtotal         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tax_rate         NUMERIC(4, 2) NOT NULL DEFAULT 0.21,
  tax_amount       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total            NUMERIC(10, 2) NOT NULL DEFAULT 0,
  deposit_amount   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  
  -- Additional info
  valid_until      DATE,
  notes            TEXT,
  legal_terms      TEXT,
  
  -- Status and tracking
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')
  ),
  accept_token     TEXT UNIQUE,
  accepted_at      TIMESTAMPTZ,
  
  -- Timestamps
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_updated_at ON quotes;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotes_tenant" ON quotes;
CREATE POLICY "quotes_tenant" ON quotes
  FOR ALL USING (tenant_id = my_tenant_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_accept_token ON quotes(accept_token);
