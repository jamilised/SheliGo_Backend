-- =====================================================================
-- 002: cerrar la API pública de Supabase sobre las tablas de la app
--
-- El frontend usa la clave "anon" de Supabase, que es pública (viaja en el
-- navegador). Sin RLS, cualquiera con esa clave puede leer o modificar las
-- tablas por /rest/v1 o Realtime: usuarios (con el hash de la contraseña),
-- mensajes de todos los chats, notificaciones, etc.
--
-- La app no las necesita por esa vía: todo pasa por el backend, que se conecta
-- directo a Postgres como dueño de las tablas y por eso no lo afecta RLS.
-- Única excepción: el formulario de contacto inserta en soporte_consultas
-- con la clave anon, así que esa tabla queda con una política solo de INSERT.
--
-- ANTES de correrla, verificar que el usuario del backend (DB_USER en Render)
-- sea el dueño de las tablas o tenga BYPASSRLS; si no, el backend dejaría de
-- ver los datos:
--
--   SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public';
--   SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = '<DB_USER sin el .ref del pooler>';
--
-- Idempotente: se puede volver a correr.
-- =====================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
    tabla text;
BEGIN
    FOREACH tabla IN ARRAY ARRAY[
        'archivos', 'categorias', 'instituciones', 'instituciones_configuracion',
        'mensajes', 'notificaciones', 'participantes_sala', 'preguntas',
        'publicaciones', 'respuestas', 'salas_chat', 'usuarios',
        'usuarios_instituciones', 'auditoria_admin'
    ] LOOP
        IF to_regclass('public.' || tabla) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabla);
        END IF;
    END LOOP;

    -- El chat ya no usa Realtime: los mensajes no se publican a los clientes
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mensajes'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.mensajes;
    END IF;

    -- Formulario de contacto: se puede enviar una consulta, no leerlas
    IF to_regclass('public.soporte_consultas') IS NOT NULL THEN
        ALTER TABLE public.soporte_consultas ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'soporte_consultas'
              AND policyname = 'soporte_consultas_solo_insertar'
        ) THEN
            CREATE POLICY soporte_consultas_solo_insertar
                ON public.soporte_consultas
                FOR INSERT
                TO anon, authenticated
                WITH CHECK (true);
        END IF;
    END IF;
END $$;

COMMIT;

-- Verificación: todas deben dar rls = true
SELECT tablename, rowsecurity AS rls
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
