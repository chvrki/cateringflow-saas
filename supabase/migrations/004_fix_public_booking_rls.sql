-- Fix HIGH vulnerability: Broken public booking flow

-- Allow public to read active menus for a tenant (needed to display menu options)
CREATE POLICY "menu_read_public" ON menus
  FOR SELECT
  USING (active = true);

-- Note: tenant resolution is handled server-side via service role client
-- No public RLS policy needed on tenants table
