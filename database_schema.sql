-- =============================================================================
-- ESQUEMA DE BASE DE DATOS - Sistema de Gestión de Máquinas
-- Plataforma: Supabase (PostgreSQL)
-- Exportado desde: SQL Editor de Supabase
-- =============================================================================

-- Tablas reales en la base de datos (dump de producción)

CREATE TABLE public.salas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  creado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT salas_pkey PRIMARY KEY (id)
);

CREATE TABLE public.equipos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo text,
  modelo text,
  sala_id uuid,
  estado text DEFAULT 'activa'::text,
  ancho_mm integer,
  alto_mm integer,
  profundidad_mm integer,
  notas text,
  frecuencia_dias integer DEFAULT 7,
  ultimo_mantenimiento timestamp with time zone,
  creado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT equipos_pkey PRIMARY KEY (id),
  CONSTRAINT equipos_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.salas(id)
);

CREATE TABLE public.perfiles (
  id uuid NOT NULL,
  email text NOT NULL,
  nombre text,
  rol text DEFAULT 'usuario'::text,
  activo boolean DEFAULT false,
  creado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT perfiles_pkey PRIMARY KEY (id),
  CONSTRAINT perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.registros (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  maquina_id uuid,
  usuario_id uuid, -- SIN FK constraint. El código hace JOIN manual con perfiles
  maquina_nombre text,
  sala_nombre text,
  operario_nombre text,
  operario_email text,
  tipo text NOT NULL,
  notas text,
  timestamp timestamp with time zone DEFAULT now(),
  resuelta boolean DEFAULT false,
  en_seguimiento boolean DEFAULT false,
  comentario_resolucion text,
  photos ARRAY, -- PostgreSQL array (no JSONB). El frontend lo recibe como JSON
  CONSTRAINT registros_pkey PRIMARY KEY (id),
  CONSTRAINT registros_maquina_id_fkey FOREIGN KEY (maquina_id) REFERENCES public.equipos(id)
);

CREATE TABLE public.seguimientos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incidencia_id uuid,
  nota text NOT NULL,
  usuario_nombre text,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT seguimientos_pkey PRIMARY KEY (id),
  CONSTRAINT seguimientos_incidencia_id_fkey FOREIGN KEY (incidencia_id) REFERENCES public.registros(id)
);

-- Tabla backup (no se usa en la aplicación)
CREATE TABLE public.usuarios_backup (
  id uuid,
  nombre text,
  email text,
  rol text,
  activo boolean,
  creado_en timestamp with time zone
);

-- =============================================================================
-- NOTAS DE MAPEO CON EL CÓDIGO
-- =============================================================================

/*
1. registros.usuario_id -> perfiles.id
   No hay FK constraint, pero el código hace:
   .from('registros').select('*, perfiles(nombre, rol)')
   Esto funciona por coincidencia de valores UUID, no por integridad referencial.
   Si un registro tiene usuario_id nulo o un UUID que no existe en perfiles,
   el JOIN devuelve null y el fallback usa operario_nombre.

2. registros.photos es ARRAY (no JSONB)
   Supabase serializa arrays PostgreSQL como JSON arrays en la respuesta.
   El código JS usa JSON.stringify/parse compatible.

3. equipos tiene campos de dimensiones (ancho_mm, alto_mm, profundidad_mm)
   y frecuencia_dias / ultimo_mantenimiento que aparecen en el formulario
   de nueva máquina (dashboard-ui.js) pero no están en todas las queries.

4. Tabla "operarios" (PIN de acceso rápido)
   El código en checklist.js la usa, pero NO aparece en este dump.
   Posiblemente:
   - Está en otro schema (no public)
   - El dump es parcial
   - Fue eliminada en algún momento
   Verificar en Supabase: Database -> Tables -> buscar "operarios"

5. Sin tabla "usuarios" activa
   Toda autenticación pasa por auth.users + perfiles.
   usuarios_backup es una copia de seguridad.

6. Sin triggers de updated_at
   Ninguna tabla tiene columna updated_at ni trigger automático.
   Las actualizaciones de equipos/perfiles no registran "última modificación".
*/
