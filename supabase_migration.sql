-- Script para actualizar la tabla profiles con campos profesionales para escritores
-- Ejecutar esto en el editor SQL de Supabase

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
ADD COLUMN IF NOT EXISTS nombre_completo TEXT,
ADD COLUMN IF NOT EXISTS pais_ciudad TEXT,
ADD COLUMN IF NOT EXISTS redes_sociales JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS sitio_web TEXT,
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS preferencias_publicacion TEXT,
ADD COLUMN IF NOT EXISTS frase_personal TEXT;

-- Comentarios para documentar los campos
COMMENT ON COLUMN profiles.foto_perfil_url IS 'URL de la imagen de perfil del autor';
COMMENT ON COLUMN profiles.nombre_completo IS 'Nombre real completo del autor (privado o para trámites)';
COMMENT ON COLUMN profiles.pais_ciudad IS 'Ubicación geográfica del autor';
COMMENT ON COLUMN profiles.redes_sociales IS 'Objeto JSON con enlaces a redes sociales (twitter, instagram, etc.)';
COMMENT ON COLUMN profiles.sitio_web IS 'URL del sitio web personal o portafolio';
COMMENT ON COLUMN profiles.fecha_nacimiento IS 'Fecha de nacimiento del autor';
COMMENT ON COLUMN profiles.preferencias_publicacion IS 'Notas sobre cómo prefiere publicar el autor';
COMMENT ON COLUMN profiles.frase_personal IS 'Firma o frase célebre que identifica al autor';
