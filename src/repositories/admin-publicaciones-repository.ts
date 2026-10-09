import type { PoolClient } from 'pg';
import dbPg from '../database/db-pg.js';
import { SqlFiltros } from '../helpers/sql-filtros-helper.js';
import { buildIlikePattern } from '../helpers/sql-search-helper.js';
import { PaginationHelper } from '../helpers/pagination-helper.js';
import type { AdminContext } from '../types/admin-types.js';
import type { AdminPublicacionesQuery } from '../validations/admin-schema.js';

/*
A diferencia de publicaciones-repository, acá sí se incluyen las publicaciones
eliminadas: moderación necesita verlas para poder restaurarlas.
Un institution_admin solo ve publicaciones de sus instituciones (las que no
tienen institución quedan solo para el admin general).
*/
class AdminPublicacionesRepository {
    db = dbPg;

    listar = async (ctx: AdminContext, filtros: AdminPublicacionesQuery) => {
        const f = new SqlFiltros();

        if (!ctx.esGlobal) {
            f.agregar(`p.institucion_id = ANY(${f.param(ctx.institucionesIds)}::uuid[])`);
        }
        if (filtros.estado) f.agregar(`p.estado = ${f.param(filtros.estado)}`);
        if (filtros.tipo) f.agregar(`p.tipo = ${f.param(filtros.tipo)}`);
        if (filtros.institucion_id) f.agregar(`p.institucion_id = ${f.param(filtros.institucion_id)}`);
        if (filtros.categoria_id) f.agregar(`p.categoria_id = ${f.param(filtros.categoria_id)}`);
        if (filtros.usuario_id) f.agregar(`p.usuario_id = ${f.param(filtros.usuario_id)}`);
        if (filtros.search) {
            const patron = f.param(buildIlikePattern(filtros.search));
            f.agregar(`(
                p.nombre ILIKE ${patron}
                OR p.descripcion ILIKE ${patron}
                OR p.lugar_institucion ILIKE ${patron}
                OR u.email ILIKE ${patron}
            )`);
        }

        const where = f.where();
        const totalRow = await this.db.queryOne(
            `SELECT COUNT(*)::int AS total
             FROM publicaciones p
             INNER JOIN usuarios u ON u.id = p.usuario_id
             ${where}`,
            f.values
        );

        const limite = f.param(filtros.limit);
        const desplazamiento = f.param(PaginationHelper.offset(filtros.page, filtros.limit));

        const items = await this.db.queryAll(
            `SELECT
                p.id, p.nombre, p.descripcion, p.tipo, p.estado,
                p.fecha_evento, p.created_at, p.updated_at, p.lugar_institucion,
                p.institucion_id, i.nombre AS institucion_nombre,
                p.categoria_id, c.nombre AS categoria_nombre,
                p.usuario_id, u.nombre AS usuario_nombre,
                u.apellido AS usuario_apellido, u.email AS usuario_email,
                a.url AS foto_principal_url
             FROM publicaciones p
             INNER JOIN usuarios u ON u.id = p.usuario_id
             LEFT JOIN instituciones i ON i.id = p.institucion_id
             LEFT JOIN categorias c ON c.id = p.categoria_id
             LEFT JOIN LATERAL (
                SELECT url FROM archivos
                WHERE publicacion_id = p.id
                ORDER BY es_principal DESC, created_at DESC
                LIMIT 1
             ) a ON true
             ${where}
             ORDER BY p.created_at DESC NULLS LAST, p.id
             LIMIT ${limite} OFFSET ${desplazamiento}`,
            f.values
        );

        return { items, total: totalRow?.total ?? 0 };
    };

    getDetalle = async (ctx: AdminContext, id: string) => {
        const values = ctx.esGlobal ? [id] : [id, ctx.institucionesIds];
        const publicacion = await this.db.queryOne(
            `SELECT
                p.id, p.nombre, p.descripcion, p.tipo, p.estado,
                p.fecha_evento, p.created_at, p.updated_at, p.lugar_institucion,
                p.institucion_id, i.nombre AS institucion_nombre,
                p.categoria_id, c.nombre AS categoria_nombre,
                p.usuario_id, u.nombre AS usuario_nombre,
                u.apellido AS usuario_apellido, u.email AS usuario_email,
                (SELECT COUNT(*) FROM preguntas pr WHERE pr.publicacion_id = p.id)::int AS preguntas_count
             FROM publicaciones p
             INNER JOIN usuarios u ON u.id = p.usuario_id
             LEFT JOIN instituciones i ON i.id = p.institucion_id
             LEFT JOIN categorias c ON c.id = p.categoria_id
             WHERE p.id = $1
               ${ctx.esGlobal ? '' : 'AND p.institucion_id = ANY($2::uuid[])'}`,
            values
        );
        if (!publicacion) return null;

        const archivos = await this.db.queryAll(
            `SELECT id, url, mime_type, es_principal
             FROM archivos
             WHERE publicacion_id = $1
             ORDER BY es_principal DESC, created_at ASC`,
            [id]
        );

        return { ...publicacion, archivos };
    };

    bloquear = async (client: PoolClient, id: string) => {
        const result = await client.query<{
            id: string;
            nombre: string;
            estado: string;
            institucion_id: string | null;
            usuario_id: string;
        }>(
            `SELECT id, nombre, estado, institucion_id, usuario_id
             FROM publicaciones
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );
        return result.rows[0] ?? null;
    };

    actualizarEstado = async (client: PoolClient, id: string, estado: string) => {
        await client.query(
            `UPDATE publicaciones SET estado = $1, updated_at = NOW() WHERE id = $2`,
            [estado, id]
        );
    };
}

export default new AdminPublicacionesRepository();
