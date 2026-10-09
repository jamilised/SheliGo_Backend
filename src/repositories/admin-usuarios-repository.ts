import type { PoolClient } from 'pg';
import dbPg from '../database/db-pg.js';
import { SqlFiltros } from '../helpers/sql-filtros-helper.js';
import { buildIlikePattern } from '../helpers/sql-search-helper.js';
import { PaginationHelper } from '../helpers/pagination-helper.js';
import type { AdminContext } from '../types/admin-types.js';
import type { AdminUsuariosQuery } from '../validations/admin-schema.js';

/*
Nunca se selecciona password_hash: estas consultas alimentan respuestas HTTP.
Un institution_admin solo ve usuarios que pertenecen a alguna de sus
instituciones, y de cada usuario solo ve esas membresías.
*/
class AdminUsuariosRepository {
    db = dbPg;

    listar = async (ctx: AdminContext, filtros: AdminUsuariosQuery) => {
        const f = new SqlFiltros();
        const alcance = ctx.esGlobal ? null : f.param(ctx.institucionesIds);

        if (alcance) {
            f.agregar(`EXISTS (
                SELECT 1 FROM usuarios_instituciones ui
                WHERE ui.usuario_id = u.id AND ui.institucion_id = ANY(${alcance}::uuid[])
            )`);
        }
        if (filtros.rol) {
            f.agregar(`u.rol::text = ${f.param(filtros.rol)}`);
        }
        if (filtros.institucion_id) {
            f.agregar(`EXISTS (
                SELECT 1 FROM usuarios_instituciones ui
                WHERE ui.usuario_id = u.id AND ui.institucion_id = ${f.param(filtros.institucion_id)}
            )`);
        }
        if (filtros.search) {
            const patron = f.param(buildIlikePattern(filtros.search));
            f.agregar(`(
                u.nombre ILIKE ${patron}
                OR u.apellido ILIKE ${patron}
                OR u.email ILIKE ${patron}
                OR (u.nombre || ' ' || COALESCE(u.apellido, '')) ILIKE ${patron}
            )`);
        }

        const where = f.where();
        const filtroMembresia = alcance ? `AND ui.institucion_id = ANY(${alcance}::uuid[])` : '';
        const filtroPublicacion = alcance ? `AND p.institucion_id = ANY(${alcance}::uuid[])` : '';

        const totalRow = await this.db.queryOne(
            `SELECT COUNT(*)::int AS total FROM usuarios u ${where}`,
            f.values
        );

        const limite = f.param(filtros.limit);
        const desplazamiento = f.param(PaginationHelper.offset(filtros.page, filtros.limit));

        const items = await this.db.queryAll(
            `SELECT
                u.id, u.nombre, u.apellido, u.email, u.telefono,
                u.rol::text AS rol, u.foto, u.created_at,
                COALESCE(inst.instituciones, '[]'::json) AS instituciones,
                (
                    SELECT COUNT(*) FROM publicaciones p
                    WHERE p.usuario_id = u.id AND p.estado <> 'eliminada' ${filtroPublicacion}
                )::int AS publicaciones_count
             FROM usuarios u
             LEFT JOIN LATERAL (
                SELECT json_agg(
                    json_build_object('id', i.id, 'nombre', i.nombre, 'es_admin', ui.es_admin)
                    ORDER BY i.nombre
                ) AS instituciones
                FROM usuarios_instituciones ui
                INNER JOIN instituciones i ON i.id = ui.institucion_id
                WHERE ui.usuario_id = u.id ${filtroMembresia}
             ) inst ON true
             ${where}
             ORDER BY u.created_at DESC NULLS LAST, u.id
             LIMIT ${limite} OFFSET ${desplazamiento}`,
            f.values
        );

        return { items, total: totalRow?.total ?? 0 };
    };

    getDetalle = async (ctx: AdminContext, id: string) => {
        const alcance = ctx.esGlobal ? '' : `AND ui.institucion_id = ANY($2::uuid[])`;
        const alcancePublicacion = ctx.esGlobal ? '' : `AND p.institucion_id = ANY($2::uuid[])`;
        const values = ctx.esGlobal ? [id] : [id, ctx.institucionesIds];

        const usuario = await this.db.queryOne(
            `SELECT u.id, u.nombre, u.apellido, u.email, u.telefono,
                    u.rol::text AS rol, u.foto, u.created_at, u.updated_at
             FROM usuarios u
             WHERE u.id = $1
               ${ctx.esGlobal ? '' : `AND EXISTS (
                    SELECT 1 FROM usuarios_instituciones ui
                    WHERE ui.usuario_id = u.id ${alcance}
               )`}`,
            values
        );
        if (!usuario) return null;

        const [instituciones, resumen, publicaciones] = await Promise.all([
            this.db.queryAll(
                `SELECT i.id, i.nombre, ui.es_admin, ui.fecha_union
                 FROM usuarios_instituciones ui
                 INNER JOIN instituciones i ON i.id = ui.institucion_id
                 WHERE ui.usuario_id = $1 ${alcance}
                 ORDER BY i.nombre ASC`,
                values
            ),
            this.db.queryOne(
                `SELECT
                    COUNT(*) FILTER (WHERE p.estado = 'activa')::int AS activas,
                    COUNT(*) FILTER (WHERE p.estado = 'recuperada')::int AS recuperadas,
                    COUNT(*) FILTER (WHERE p.estado = 'eliminada')::int AS eliminadas
                 FROM publicaciones p
                 WHERE p.usuario_id = $1 ${alcancePublicacion}`,
                values
            ),
            this.db.queryAll(
                `SELECT p.id, p.nombre, p.tipo, p.estado, p.created_at,
                        i.nombre AS institucion_nombre
                 FROM publicaciones p
                 LEFT JOIN instituciones i ON i.id = p.institucion_id
                 WHERE p.usuario_id = $1 ${alcancePublicacion}
                 ORDER BY p.created_at DESC NULLS LAST
                 LIMIT 5`,
                values
            )
        ]);

        return {
            ...usuario,
            instituciones,
            publicaciones_resumen: resumen,
            publicaciones_recientes: publicaciones
        };
    };

    // ---------- Operaciones dentro de una transacción ----------

    // Bloquea la fila para que dos administradores no cambien el mismo usuario a la vez
    bloquear = async (client: PoolClient, id: string) => {
        const result = await client.query<{ id: string; rol: string; email: string }>(
            `SELECT id, rol::text AS rol, email FROM usuarios WHERE id = $1 FOR UPDATE`,
            [id]
        );
        return result.rows[0] ?? null;
    };

    getMembresias = async (client: PoolClient, usuarioId: string) => {
        const result = await client.query<{ institucion_id: string; es_admin: boolean }>(
            `SELECT institucion_id::text AS institucion_id, es_admin
             FROM usuarios_instituciones
             WHERE usuario_id = $1
             ORDER BY institucion_id`,
            [usuarioId]
        );
        return result.rows;
    };

    actualizarRol = async (client: PoolClient, usuarioId: string, rol: string) => {
        await client.query(
            `UPDATE usuarios SET rol = $1, updated_at = NOW() WHERE id = $2`,
            [rol, usuarioId]
        );
    };

    quitarAdministracion = async (client: PoolClient, usuarioId: string) => {
        await client.query(
            `UPDATE usuarios_instituciones SET es_admin = false
             WHERE usuario_id = $1 AND es_admin`,
            [usuarioId]
        );
    };

    /*
    Marca al usuario como administrador de esas instituciones. Si todavía no
    era miembro, se crea la membresía. Depende del índice único
    (usuario_id, institucion_id) que agrega la migración 001.
    */
    asignarAdministracion = async (client: PoolClient, usuarioId: string, institucionesIds: string[]) => {
        await client.query(
            `INSERT INTO usuarios_instituciones (fecha_union, usuario_id, institucion_id, es_admin)
             SELECT CURRENT_DATE, $1, inst_id, true
             FROM unnest($2::uuid[]) AS inst_id
             ON CONFLICT (usuario_id, institucion_id) DO UPDATE SET es_admin = true`,
            [usuarioId, institucionesIds]
        );
    };

    // Deja al usuario exactamente en estas instituciones, conservando es_admin de las que ya tenía
    reemplazarMembresias = async (client: PoolClient, usuarioId: string, institucionesIds: string[]) => {
        await client.query(
            `DELETE FROM usuarios_instituciones
             WHERE usuario_id = $1 AND NOT (institucion_id = ANY($2::uuid[]))`,
            [usuarioId, institucionesIds]
        );
        await client.query(
            `INSERT INTO usuarios_instituciones (fecha_union, usuario_id, institucion_id)
             SELECT CURRENT_DATE, $1, inst_id
             FROM unnest($2::uuid[]) AS inst_id
             ON CONFLICT (usuario_id, institucion_id) DO NOTHING`,
            [usuarioId, institucionesIds]
        );
    };
}

export default new AdminUsuariosRepository();
