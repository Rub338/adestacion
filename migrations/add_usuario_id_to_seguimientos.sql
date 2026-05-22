-- =============================================================================
-- MIGRACIÓN: Normalizar seguimientos con usuario_id
-- =============================================================================
-- Ejecutar en Supabase SQL Editor (una sola vez)

-- 1. Añadir usuario_id a la tabla existente (sin tocar datos ni renombrar)
ALTER TABLE public.seguimientos
  ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES public.perfiles(id);

-- 2. Actualizar notas antiguas: hacer match por nombre
-- Quita el sufijo " (Rol)" si existe, compara ignorando mayúsculas/espacios
UPDATE public.seguimientos s
SET usuario_id = p.id
FROM public.perfiles p
WHERE s.usuario_id IS NULL
  AND p.nombre IS NOT NULL
  AND LOWER(TRIM(REGEXP_REPLACE(s.usuario_nombre, '\s*\([^)]*\)\s*$', ''))) = LOWER(TRIM(p.nombre));

-- 3. Índice para que JOINs sean rápidos
CREATE INDEX IF NOT EXISTS idx_seguimientos_usuario
  ON public.seguimientos(usuario_id);

-- 4. Verificar cuántas notas quedaron sin match
-- SELECT COUNT(*) FROM public.seguimientos WHERE usuario_id IS NULL;
