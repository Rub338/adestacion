-- Migración: Eliminar 'Mantenimiento' de la base de datos
-- Ejecutar en Supabase SQL Editor antes de desplegar los cambios de código

-- 1. Convertir todos los registros antiguos de 'Mantenimiento' a 'Incidencia'
UPDATE registros SET tipo = 'Incidencia' WHERE tipo = 'Mantenimiento';

-- 2. (Opcional) Verificar que no quedan registros de tipo 'Mantenimiento'
-- SELECT COUNT(*) FROM registros WHERE tipo = 'Mantenimiento';
