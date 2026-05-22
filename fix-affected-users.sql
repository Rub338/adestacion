-- ===================================================================
-- REACTIVAR USUARIOS QUE FUERON AFECTADOS INCORRECTAMENTE
-- ===================================================================
-- Si el UPDATE anterior afectó a usuarios que ya tenían un rol,
-- ejecuta este comando para reactivarlos

-- Reactivar usuarios que tienen un rol pero están marcados como inactivos
UPDATE public.perfiles 
SET activo = true 
WHERE rol IS NOT NULL AND activo = false;

-- Verificar el cambio
SELECT id, email, nombre, rol, activo 
FROM public.perfiles 
WHERE rol IS NOT NULL 
ORDER BY creado_en DESC;
