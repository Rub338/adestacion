-- ===================================================================
-- VERIFICAR RLS POLICIES EN TABLA perfiles
-- ===================================================================
-- Ejecuta esto en Supabase SQL Editor para ver qué políticas
-- de Row Level Security están activas en la tabla perfiles

-- Listar todas las RLS policies en la tabla perfiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'perfiles';

-- Verificar si RLS está activado en la tabla
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'perfiles';
