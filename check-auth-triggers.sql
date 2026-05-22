-- ===================================================================
-- VERIFICAR TRIGGERS EN TABLA auth.users
-- ===================================================================
-- Supabase puede tener triggers que crean automáticamente
-- perfiles cuando se crea un usuario en auth.users

-- Listar todos los triggers en el schema auth
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- También verificar en el schema public
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE action_statement ILIKE '%perfiles%';
