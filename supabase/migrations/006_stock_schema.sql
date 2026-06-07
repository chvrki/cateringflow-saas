-- ============================================================
-- Migration 006: Stock Management — Inventory tracking
-- ============================================================

-- Add stock fields to ingredients
ALTER TABLE ingredients
  ADD COLUMN stock_quantity  NUMERIC(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN stock_min       NUMERIC(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN stock_location  TEXT,
  -- Stored generated column enables efficient low-stock filtering without RPC
  ADD COLUMN stock_is_low    BOOLEAN GENERATED ALWAYS AS (stock_quantity <= stock_min) STORED;

-- Stock movements log (immutable audit trail)
CREATE TABLE stock_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ingredient_id  UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('entrada', 'salida', 'ajuste')),
  quantity       NUMERIC(10,3) NOT NULL,
  reason         TEXT,
  event_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_movements_tenant" ON stock_movements
  FOR ALL USING (tenant_id = my_tenant_id());

-- Indexes
CREATE INDEX idx_stock_movements_ingredient ON stock_movements(ingredient_id, created_at DESC);
CREATE INDEX idx_stock_movements_tenant     ON stock_movements(tenant_id, created_at DESC);
