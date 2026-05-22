-- ===================================================================
-- VERIFICAR QUÉ USUARIOS FUERON AFECTADOS POR EL UPDATE
-- ===================================================================
-- Ejecuta esto en Supabase SQL Editor para ver qué usuarios
-- tienen activo = false después del update

-- Ver todos los usuarios con su estado
SELECT 
  id, 
  email, 
  nombre, 
  rol, 
  activo, 
  creado_en
FROM public.perfiles 
ORDER BY creado_en DESC;

-- Ver específicamente usuarios con activo = false
SELECT 
  id, 
  email, 
  nombre, 
  rol, 
  activo, 
  creado_en
FROM public.perfiles 
WHERE activo = false;

-- Ver usuarios con rol = null
SELECT 
  id, 
  email, 
  nombre, 
  rol, 
  activo, 
  creado_en
FROM public.perfiles 
WHERE rol IS NULL;
