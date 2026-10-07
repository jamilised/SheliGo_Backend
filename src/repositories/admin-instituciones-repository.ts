import type { PoolClient } from 'pg';
import dbPg from '../database/db-pg.js';
import { SqlFiltros } from '../helpers/sql-filtros-helper.js';
import { buildIlikePattern } from '../helpers/sql-search-helper.js';
import { PaginationHelper } from '../helpers/pagination-helper.js';
import type { AdminContext } from '../types/admin-types.js';
import type { AdminListaQuery } from '../validations/admin-schema.js';

export type InstitucionDatos = {
    nombre: string;
    email: string | null;
    direccion: string | null;
    telefono: string | null;
    latitud: number | null;
    longitud: number | null;
    foto: string | null;
};

// Solo columnas que la app ya usa en instituciones
const COLUMNAS = 'i.id, i.nombre, i.email, i.direccion, i.telefono, i.foto, i.latitud, i.longitud, i.created_at';

class AdminInstitucionesRepository {
    db = dbPg;

    listar = async (ctx: AdminContext, filtros: AdminListaQuery) => {
        const f = new SqlFiltros();

        if (!ctx.esGlobal) {
            f.agregar(`i.id = ANY(${f.param(ctx.institucionesIds)}::uuid[])`);
        }
        if (filtros.search) {
            const patron = f.param(buildIlikePattern(filtros.search));
            f.agregar(`(i.nombre ILIKE ${patron} OR i.direccion ILIKE ${patron} OR i.email ILIKE ${patron})`);
        }

        const where = f.where();
        const totalRow = await this.db.queryOne(
            `SELECT COUNT(*)::int AS total FROM instituciones i ${where}`,
            f.values
        );

        const limite = f.param(filtros.limit);
        const desplazamiento = f.param(PaginationHelper.offset(filtros.page, filtros.limit));

        const items = await this.db.queryAll(
            `SELECT ${COLUMNAS},
                (SELECT COUNT(*) FROM usuarios_instituciones ui WHERE ui.institucion_id = i.id)::int AS miembros_count,
                (SELECT COUNT(*) FROM usuarios_instituciones ui WHERE ui.institucion_id = i.id AND ui.es_admin)::int AS admins_count,
                (SELECT COUNT(*) FROM publicaciones p WHERE p.institucion_id = i.id AND p.estado = 'activa')::int AS publicaciones_activas,
                (SELECT COUNT(*) FROM publicaciones p WHERE p.institucion_id = i.id)::int AS publicaciones_total
             FROM instituciones i
             ${where}
             ORDER BY i.nombre ASC, i.id
             LIMIT ${limite} OFFSET ${desplazamiento}`,
            f.values
        );

        return { items, total: totalRow?.total ?? 0 };
    };

    getDetalle = async (ctx: AdminContext, id: string) => {
        if (!ctx.esGlobal && !ctx.institucionesIds.includes(id)) return null;

        const institucion = await this.db.queryOne(
            `SELECT ${COLUMNAS},
                (SELECT COUNT(*) FROM usuarios_instituciones ui WHERE ui.institucion_id = i.id)::int AS miembros_count,
                (SELECT COUNT(*) FROM publicaciones p WHERE p.institucion_id = i.id AND p.estado = 'activa')::int AS publicaciones_activas,
                (SELECT COUNT(*) FROM publicaciones p WHERE p.institucion_id = i.id AND p.estado = 'recuperada')::int AS publicaciones_recuperadas,
                (SELECT COUNT(*) FROM publicaciones p WHERE p.institucion_id = i.id)::int AS publicaciones_total
             FROM instituciones i
             WHERE i.id = $1`,
            [id]
        );
        if (!institucion) return null;

        const administradores = await this.db.queryAll(
            `SELECT u.id, u.nombre, u.apellido, u.email
             FROM usuarios_instituciones ui
             INNER JOIN usuarios u ON u.id = ui.usuario_id
             WHERE ui.institucion_id = $1 AND ui.es_admin
             ORDER BY u.nombre ASC, u.apellido ASC`,
            [id]
        );

        return { ...institucion, administradores };
    };

    // Cuántos de estos ids existen (para validar asignaciones)
    contarExistentes = async (client: PoolClient, ids: string[]): Promise<number> => {
        const result = await client.query<{ total: number }>(
            `SELECT COUNT(*)::int AS total FROM instituciones WHERE id = ANY($1::uuid[])`,
            [ids]
        );
        return result.rows[0]?.total ?? 0;
    };

    // ---------- Operaciones dentro de una transacción ----------

    bloquear = async (client: PoolClient, id: string) => {
        const result = await client.query<InstitucionDatos & { id: string }>(
            `SELECT id, nombre, email, direccion, telefono, latitud, longitud, foto
             FROM instituciones
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );
        return result.rows[0] ?? null;
    };

    crear = async (client: PoolClient, id: string, datos: InstitucionDatos) => {
        const result = await client.query(
            `INSERT INTO instituciones
                (id, nombre, email, direccion, telefono, latitud, longitud, foto, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             RETURNING id, nombre, email, direccion, telefono, foto, latitud, longitud, created_at`,
            [id, datos.nombre, datos.email, datos.direccion, datos.telefono, datos.latitud, datos.longitud, datos.foto]
        );
        return result.rows[0];
    };

    actualizar = async (client: PoolClient, id: string, datos: InstitucionDatos) => {
        const result = await client.query(
            `UPDATE instituciones
             SET nombre = $2, email = $3, direccion = $4, telefono = $5,
                 latitud = $6, longitud = $7, foto = $8
             WHERE id = $1
             RETURNING id, nombre, email, direccion, telefono, foto, latitud, longitud, created_at`,
            [id, datos.nombre, datos.email, datos.direccion, datos.telefono, datos.latitud, datos.longitud, datos.foto]
        );
        return result.rows[0];
    };

    /*
    publicaciones.institucion_id es ON DELETE RESTRICT y usuarios_instituciones
    es ON DELETE CASCADE: se cuentan ambas para no borrar membresías en cascada.
    */
    contarDependencias = async (client: PoolClient, id: string) => {
        const result = await client.query<{ publicaciones: number; miembros: number }>(
            `SELECT
                (SELECT COUNT(*) FROM publicaciones WHERE institucion_id = $1)::int AS publicaciones,
                (SELECT COUNT(*) FROM usuarios_instituciones WHERE institucion_id = $1)::int AS miembros`,
            [id]
        );
        return result.rows[0] ?? { publicaciones: 0, miembros: 0 };
    };

    eliminar = async (client: PoolClient, id: string) => {
        await client.query(`DELETE FROM instituciones WHERE id = $1`, [id]);
    };
}

export default new AdminInstitucionesRepository();
