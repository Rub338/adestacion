-- =============================================================================
-- MIGRACIÓN COMPLETA: Restructuración de base de datos
-- Ejecutar en Supabase SQL Editor en ORDEN (de arriba a abajo)
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════
-- PASO 0: Borrar datos antiguos PRIMERO (evita errores de FK)
-- ⚠️ IRREVERSIBLE. Solo ejecutar si estás 100% seguro.
-- ═══════════════════════════════════════════════════════════════════
DELETE FROM public.seguimientos;
DELETE FROM public.registros;

-- ═══════════════════════════════════════════════════════════════════
-- PASO 1: Política RLS en perfiles (PERMITIR lectura a todos los auth)
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'perfiles'
      AND policyname = 'perfiles_select_auth'
  ) THEN
    CREATE POLICY "perfiles_select_auth"
      ON public.perfiles FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════
-- PASO 2: Limpiar equipos (eliminar columnas sin uso)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.equipos
  DROP COLUMN IF EXISTS ancho_mm,
  DROP COLUMN IF EXISTS alto_mm,
  DROP COLUMN IF EXISTS profundidad_mm,
  DROP COLUMN IF EXISTS frecuencia_dias,
  DROP COLUMN IF EXISTS ultimo_mantenimiento;

-- ═══════════════════════════════════════════════════════════════════
-- PASO 3: Normalizar registros
-- ═══════════════════════════════════════════════════════════════════

-- 3.1 Eliminar columnas denormalizadas PRIMERO
ALTER TABLE public.registros
  DROP COLUMN IF EXISTS maquina_nombre,
  DROP COLUMN IF EXISTS sala_nombre,
  DROP COLUMN IF EXISTS operario_nombre,
  DROP COLUMN IF EXISTS operario_email;

-- 3.2 Añadir FK constraint a perfiles
ALTER TABLE public.registros
  ADD CONSTRAINT registros_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id)
  ON DELETE SET NULL;

-- 3.3 Hacer maquina_id NOT NULL
ALTER TABLE public.registros
  ALTER COLUMN maquina_id SET NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- PASO 4: Normalizar seguimientos
-- ═══════════════════════════════════════════════════════════════════

-- 4.1 Hacer incidencia_id NOT NULL
ALTER TABLE public.seguimientos
  ALTER COLUMN incidencia_id SET NOT NULL;

-- 4.2 Asegurar que usuario_id tiene FK (ya debería existir de migración previa)
-- Si no existe, descomenta:
-- ALTER TABLE public.seguimientos
--   ADD CONSTRAINT seguimientos_usuario_id_fkey
--   FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id)
--   ON DELETE SET NULL;

-- 4.3 Eliminar usuario_nombre
ALTER TABLE public.seguimientos
  DROP COLUMN IF EXISTS usuario_nombre;

-- ═══════════════════════════════════════════════════════════════════
-- PASO 5: Borrar tabla residual
-- ═══════════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.usuarios_backup;
