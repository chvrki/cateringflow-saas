-- ============================================================
-- Migration 005: Escandallos — Ingredients, Recipes & Menu Cost
-- ============================================================

-- Ingredients master list
CREATE TABLE ingredients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  unit             TEXT NOT NULL CHECK (unit IN ('kg', 'l', 'g', 'ml', 'unit')),
  cost_per_unit    NUMERIC(10,4) NOT NULL DEFAULT 0,
  waste_percentage NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (waste_percentage >= 0 AND waste_percentage < 100),
  supplier         TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Price history (one row per cost change)
CREATE TABLE ingredient_price_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id  UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  cost_per_unit  NUMERIC(10,4) NOT NULL,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recipes / Escandallos
CREATE TABLE recipes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT CHECK (category IN ('entrante', 'primer', 'segundo', 'postre', 'bebida', 'extra')),
  servings    INTEGER NOT NULL DEFAULT 1 CHECK (servings > 0),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ingredients within a recipe
CREATE TABLE recipe_ingredients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id      UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id  UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity       NUMERIC(10,4) NOT NULL CHECK (quantity > 0),
  unit           TEXT NOT NULL
);

-- Sub-recipes (a recipe can embed another recipe)
CREATE TABLE recipe_sub_recipes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  child_recipe_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  quantity         NUMERIC(10,4) NOT NULL CHECK (quantity > 0),
  CHECK (parent_recipe_id <> child_recipe_id)
);

-- Recipes assigned to a menu (for cost integration)
CREATE TABLE menu_recipes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id             UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  recipe_id           UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  portions_per_person NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (portions_per_person > 0),
  UNIQUE (menu_id, recipe_id)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE ingredients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_sub_recipes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_recipes             ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredients_tenant" ON ingredients
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "price_history_tenant" ON ingredient_price_history
  FOR ALL USING (ingredient_id IN (
    SELECT id FROM ingredients WHERE tenant_id = my_tenant_id()
  ));

CREATE POLICY "recipes_tenant" ON recipes
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "recipe_ingredients_tenant" ON recipe_ingredients
  FOR ALL USING (recipe_id IN (
    SELECT id FROM recipes WHERE tenant_id = my_tenant_id()
  ));

CREATE POLICY "recipe_sub_recipes_tenant" ON recipe_sub_recipes
  FOR ALL USING (parent_recipe_id IN (
    SELECT id FROM recipes WHERE tenant_id = my_tenant_id()
  ));

CREATE POLICY "menu_recipes_tenant" ON menu_recipes
  FOR ALL USING (menu_id IN (
    SELECT id FROM menus WHERE tenant_id = my_tenant_id()
  ));

-- ============================================================
-- Triggers updated_at  (update_updated_at() defined in 001)
-- ============================================================
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_ingredients_tenant        ON ingredients(tenant_id);
CREATE INDEX idx_ingredients_name          ON ingredients(tenant_id, name);
CREATE INDEX idx_recipes_tenant            ON recipes(tenant_id);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ing    ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_recipe_sub_recipes_parent ON recipe_sub_recipes(parent_recipe_id);
CREATE INDEX idx_price_history_ingredient  ON ingredient_price_history(ingredient_id, recorded_at DESC);
CREATE INDEX idx_menu_recipes_menu         ON menu_recipes(menu_id);
CREATE INDEX idx_menu_recipes_recipe       ON menu_recipes(recipe_id);
