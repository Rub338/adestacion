-- ===================================================================
-- VERIFICAR TRIGGERS EN TABLA perfiles
-- ===================================================================
-- Ejecuta esto en Supabase SQL Editor para ver qué triggers
-- están activos en la tabla perfiles

-- Listar todos los triggers en la tabla perfiles
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'perfiles';

-- Listar todas las funciones relacionadas con triggers
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%perfiles%' 
OR routine_name LIKE '%auth%' 
OR routine_name LIKE '%user%';
