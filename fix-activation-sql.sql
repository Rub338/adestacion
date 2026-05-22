-- ===================================================================
-- COMANDOS SQL PARA EJECUTAR EN SUPABASE SQL EDITOR
-- ===================================================================
-- Estos comandos arreglan el problema de que los nuevos usuarios
-- se crean como activos por defecto.

-- Paso 1: Cambiar el valor por defecto de activo a false
ALTER TABLE public.perfiles 
ALTER COLUMN activo SET DEFAULT false;

-- Paso 2: Actualizar perfiles existentes pendientes de activación
-- (SOLO usuarios que tienen rol = null - NO afectar a usuarios con rol)
UPDATE public.perfiles 
SET activo = false 
WHERE rol IS NULL;

-- Paso 3: Verificar el cambio (opcional)
SELECT id, email, nombre, rol, activo 
FROM public.perfiles 
ORDER BY creado_en DESC 
LIMIT 10;
