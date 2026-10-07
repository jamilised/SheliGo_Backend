-- =====================================================================
-- Migración 001 — Backoffice: roles administrativos y auditoría
-- =====================================================================
-- Ejecutar UNA vez en Supabase (SQL Editor) antes de desplegar la rama
-- backoffice. Es idempotente: se puede volver a ejecutar sin efectos.
--
-- Cambios (aprobados):
--   1. usuarios.rol admite solo: 'user' | 'institution_admin' | 'admin'
--   2. usuarios_instituciones.es_admin: instituciones que administra
--      cada institution_admin
--   3. Elimina relaciones usuario-institución duplicadas y lo impide
--      con un índice único (usuario_id, institucion_id)
--   4. Tabla auditoria_admin (RLS activo, sin políticas: solo el
--      backend, con su conexión directa, puede leerla/escribirla)
-- =====================================================================

BEGIN;

-- 1) Roles permitidos ---------------------------------------------------
-- Si rol es un tipo enumerado se agrega el valor nuevo; si es texto se
-- agrega una restricción CHECK. Así no dependemos de cómo se creó.
DO $$
DECLARE
    tipo_rol text;
    es_enum  boolean;
BEGIN
    SELECT c.udt_name, (t.typtype = 'e')
      INTO tipo_rol, es_enum
      FROM information_schema.columns c
      JOIN pg_type t ON t.typname = c.udt_name
     WHERE c.table_schema = 'public'
       AND c.table_name = 'usuarios'
       AND c.column_name = 'rol';

    IF es_enum THEN
        EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', tipo_rol, 'institution_admin');
        EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', tipo_rol, 'admin');
    ELSIF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'usuarios_rol_check'
           AND conrelid = 'public.usuarios'::regclass
    ) THEN
        ALTER TABLE public.usuarios
            ADD CONSTRAINT usuarios_rol_check
            CHECK (rol IN ('user', 'institution_admin', 'admin'));
    END IF;
END $$;

-- 2) Alcance del administrador institucional ----------------------------
ALTER TABLE public.usuarios_instituciones
    ADD COLUMN IF NOT EXISTS es_admin boolean NOT NULL DEFAULT false;

-- 3) Relaciones duplicadas ----------------------------------------------
-- Conserva una fila por par (la primera física) y borra las repetidas.
DELETE FROM public.usuarios_instituciones a
 USING public.usuarios_instituciones b
 WHERE a.usuario_id = b.usuario_id
   AND a.institucion_id = b.institucion_id
   AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_instituciones_usuario_institucion_key
    ON public.usuarios_instituciones (usuario_id, institucion_id);

-- Índice de la FK institucion_id (listados de miembros por institución)
CREATE INDEX IF NOT EXISTS usuarios_instituciones_institucion_id_idx
    ON public.usuarios_instituciones (institucion_id);

-- 4) Auditoría administrativa --------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria_admin (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id       uuid NOT NULL REFERENCES public.usuarios(id)
                       ON UPDATE CASCADE ON DELETE RESTRICT,
    accion         text NOT NULL,          -- ej.: 'publicacion.cambiar_estado'
    entidad        text NOT NULL,          -- 'usuario' | 'publicacion' | 'institucion' | 'categoria'
    entidad_id     uuid,
    institucion_id uuid REFERENCES public.instituciones(id)
                       ON UPDATE CASCADE ON DELETE SET NULL,
    detalle        jsonb,                  -- valores antes / después
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auditoria_admin_admin_id_idx       ON public.auditoria_admin (admin_id);
CREATE INDEX IF NOT EXISTS auditoria_admin_created_at_idx     ON public.auditoria_admin (created_at DESC);
CREATE INDEX IF NOT EXISTS auditoria_admin_entidad_idx        ON public.auditoria_admin (entidad, entidad_id);
CREATE INDEX IF NOT EXISTS auditoria_admin_institucion_id_idx ON public.auditoria_admin (institucion_id);

-- Sin políticas: la clave anónima del frontend no puede leerla ni escribirla.
ALTER TABLE public.auditoria_admin ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ---------------------------------------------------------------------
-- DESPUÉS de la migración: asignar el primer administrador global.
-- No existe endpoint para auto-promoverse; se hace a mano y una sola vez.
--
--   UPDATE public.usuarios SET rol = 'admin' WHERE email = 'tu-email@dominio.com';
-- ---------------------------------------------------------------------
