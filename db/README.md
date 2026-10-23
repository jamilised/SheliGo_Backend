# Esquema de la base

`schema.sql` es la estructura del esquema `public` de Supabase (tablas, tipos,
claves, índices, RLS y políticas). No tiene datos ni credenciales.

## Regenerarlo

En Supabase → SQL Editor, pegar `generar-ddl.sql`, correrlo y copiar la única
celda del resultado en `schema.sql`. Es equivalente a:

```
pg_dump "<URI del Session pooler>" --schema-only --schema=public --no-owner --no-privileges -f db/schema.sql
```

(con `pg_dump` 17 o superior, la versión del servidor).

Los cambios de esquema se hacen con las migraciones de `migrations/`; después
de aplicar una, regenerar `schema.sql` para que quede al día.
