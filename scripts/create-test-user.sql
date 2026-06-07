-- Script para crear usuario de prueba
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tenant de prueba
INSERT INTO tenants (name, slug, plan) 
VALUES ('Catering de Prueba', 'catering-prueba', 'free')
ON CONFLICT (slug) DO NOTHING;

-- 2. Obtener el tenant_id
DO $$
DECLARE
    test_tenant UUID;
BEGIN
    SELECT id INTO test_tenant FROM tenants WHERE slug = 'catering-prueba';
    
    -- 3. Crear usuario de prueba en auth.users (necesita ser creado via auth API)
    -- Este paso debe hacerse via el cliente de Supabase o manualmente en el dashboard
    
    -- 4. Crear profile asociado (reemplaza USER_ID con el ID real del usuario)
    -- INSERT INTO profiles (id, tenant_id, full_name, email, role)
    -- VALUES ('USER_ID', test_tenant, 'Usuario Prueba', 'test@catering.com', 'admin_catering')
    -- ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Tenant creado con ID: %', test_tenant;
    RAISE NOTICE 'Ahora crea el usuario via auth y luego ejecuta el INSERT en profiles con el USER_ID';
END $$;

-- Consulta para verificar
SELECT * FROM tenants WHERE slug = 'catering-prueba';
