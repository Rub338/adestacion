-- ===================================================================
-- CORREGIR FUNCIÓN crear_perfil_usuario()
-- ===================================================================
-- Esta función estaba estableciendo rol='usuario' y activo=TRUE
-- Lo modificamos para establecer rol=NULL y activo=FALSE

-- Paso 1: Eliminar el trigger que depende de la función
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Paso 2: Eliminar la función anterior
DROP FUNCTION IF EXISTS public.crear_perfil_usuario();

-- Paso 3: Crear la función corregida
CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, rol, activo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NULL, -- Sin rol hasta que el admin lo active
    FALSE -- Inactivo hasta que el admin lo active
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Paso 4: Recrear el trigger con la función corregida
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.crear_perfil_usuario();

-- Verificar que la función se creó correctamente
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'crear_perfil_usuario';
