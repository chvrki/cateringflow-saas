-- ============================================================
-- Migration 007: Purchase Orders — Compras internas
-- ============================================================

-- Suppliers (proveedores estructurados)
CREATE TABLE suppliers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase orders (pedidos de compra)
CREATE TABLE purchase_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  status      TEXT NOT NULL DEFAULT 'borrador'
                CHECK (status IN ('borrador', 'enviado', 'recibido', 'cancelado')),
  notes       TEXT,
  sent_at     TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order line items
CREATE TABLE purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id     UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_ordered  NUMERIC(10,3) NOT NULL CHECK (quantity_ordered > 0),
  quantity_received NUMERIC(10,3),
  unit              TEXT NOT NULL,
  unit_price        NUMERIC(10,4),
  notes             TEXT
);

-- RLS
ALTER TABLE suppliers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_tenant" ON suppliers
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "purchase_orders_tenant" ON purchase_orders
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "purchase_order_items_tenant" ON purchase_order_items
  FOR ALL USING (purchase_order_id IN (
    SELECT id FROM purchase_orders WHERE tenant_id = my_tenant_id()
  ));

-- updated_at triggers (reuses update_updated_at() from migration 001)
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_suppliers_tenant         ON suppliers(tenant_id);
CREATE INDEX idx_purchase_orders_tenant   ON purchase_orders(tenant_id, created_at DESC);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_order_items_order        ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_order_items_ingredient   ON purchase_order_items(ingredient_id);
