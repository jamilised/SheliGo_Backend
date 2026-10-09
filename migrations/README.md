# Migraciones

Se ejecutan a mano en Supabase → SQL Editor, en orden numérico. Cada una es
idempotente (se puede volver a correr) y va dentro de una transacción: o se
aplica completa o no se aplica nada.

## Si queda en "Running" o falla con `lock timeout`

Otra conexión está usando las tablas (`usuarios`, `usuarios_instituciones`).

1. Cancelar cualquier ejecución anterior de la migración que siga activa y ver
   quién bloquea:

   ```sql
   SELECT pid, usename, application_name, state,
          now() - xact_start AS transaccion_abierta_hace,
          wait_event_type, left(query, 80) AS consulta
   FROM pg_stat_activity
   WHERE datname = current_database() AND pid <> pg_backend_pid()
   ORDER BY xact_start NULLS LAST;
   ```

   - Filas con `state = 'idle in transaction'` y mucho tiempo abiertas son las
     que bloquean.
   - Una fila `active` con `wait_event_type = 'Lock'` cuya consulta empieza con
     `DO $$` es una ejecución anterior de la migración que sigue esperando.

2. Cancelar la migración colgada (`pg_cancel_backend`) y, si hace falta,
   cerrar la conexión que bloquea (`pg_terminate_backend`):

   ```sql
   SELECT pg_cancel_backend(<pid>);     -- cancela la consulta
   SELECT pg_terminate_backend(<pid>);  -- cierra la conexión (el pool del backend se reconecta solo)
   ```

3. Volver a correr la migración. Conviene hacerlo con poco tráfico, o con el
   backend detenido unos segundos.

## Verificar que quedó aplicada

```sql
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'usuarios_instituciones'
            AND column_name = 'es_admin')                             AS tiene_es_admin,
  to_regclass('public.auditoria_admin') IS NOT NULL                    AS tiene_auditoria,
  to_regclass('public.usuarios_instituciones_usuario_institucion_key')
    IS NOT NULL                                                        AS tiene_indice_unico;
```

Las tres columnas tienen que dar `true`.
