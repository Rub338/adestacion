-- ===================================================================
-- VERIFICAR FUNCIÓN crear_perfil_usuario()
-- ===================================================================
-- Esta función es ejecutada por el trigger on_auth_user_created
-- y es la que está creando el perfil con valores incorrectos

-- Ver la definición de la función
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'crear_perfil_usuario';
