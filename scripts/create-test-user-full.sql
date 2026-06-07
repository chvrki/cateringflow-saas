-- Script completo para crear usuario de prueba
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tenant de prueba
INSERT INTO tenants (name, slug, plan) 
VALUES ('Catering de Prueba', 'catering-prueba', 'free')
RETURNING id;

-- 2. Crear usuario en auth.users (esto debe hacerse via RPC o manualmente)
-- Vamos a usar una función RPC para crear el usuario

CREATE OR REPLACE FUNCTION create_test_user()
RETURNS TEXT AS $$
DECLARE
    tenant_id UUID;
    user_id UUID;
BEGIN
    -- Obtener tenant
    SELECT id INTO tenant_id FROM tenants WHERE slug = 'catering-prueba';
    
    IF tenant_id IS NULL THEN
        -- Crear tenant si no existe
        INSERT INTO tenants (name, slug, plan) 
        VALUES ('Catering de Prueba', 'catering-prueba', 'free')
        RETURNING id INTO tenant_id;
    END IF;
    
    -- Crear usuario en auth.users
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data
    ) VALUES (
        gen_random_uuid(),
        'test@catering.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"full_name": "Usuario Prueba"}'
    ) RETURNING id INTO user_id;
    
    -- Crear profile asociado
    INSERT INTO profiles (id, tenant_id, full_name, email, role)
    VALUES (user_id, tenant_id, 'Usuario Prueba', 'test@catering.com', 'admin_catering');
    
    RETURN 'Usuario creado: test@catering.com / password123';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar la función
SELECT create_test_user();

-- Verificar resultados
SELECT 
    u.email,
    p.full_name,
    p.role,
    t.name as tenant_name,
    t.slug as tenant_slug
FROM auth.users u
JOIN profiles p ON u.id = p.id
JOIN tenants t ON p.tenant_id = t.id
WHERE u.email = 'test@catering.com';
