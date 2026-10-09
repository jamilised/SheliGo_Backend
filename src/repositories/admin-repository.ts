import dbPg from '../database/db-pg.js';
import type { AdminContext } from '../types/admin-types.js';

/*
Consultas de sesión y dashboard del backoffice.
Toda consulta que recibe un AdminContext aplica el alcance:
- admin: sin filtro.
- institution_admin: solo datos de sus instituciones (es_admin = true).
*/
class AdminRepository {
    db = dbPg;

    // Rol actual del usuario e instituciones que administra. null si el usuario ya no existe.
    getAcceso = async (usuarioId: string): Promise<{ rol: string; instituciones_ids: string[] } | null> => {
        const sql = `
            SELECT
                u.rol::text AS rol,
                COALESCE(
                    array_agg(ui.institucion_id::text) FILTER (WHERE ui.es_admin),
                    '{}'::text[]
                ) AS instituciones_ids
            FROM usuarios u
            LEFT JOIN usuarios_instituciones ui ON ui.usuario_id = u.id
            WHERE u.id = $1
            GROUP BY u.id
        `;
        return await this.db.queryOne(sql, [usuarioId]);
    };

    getPerfil = async (ctx: AdminContext) => {
        const usuario = await this.db.queryOne(
            `SELECT id, nombre, apellido, email, foto, rol::text AS rol
             FROM usuarios
             WHERE id = $1`,
            [ctx.id]
        );

        // Para el admin global no se listan instituciones: administra todas.
        const instituciones = ctx.esGlobal
            ? []
            : await this.db.queryAll(
                `SELECT id, nombre
                 FROM instituciones
                 WHERE id = ANY($1::uuid[])
                 ORDER BY nombre ASC`,
                [ctx.institucionesIds]
            );

        return { usuario, instituciones };
    };

    getDashboard = async (ctx: AdminContext) => {
        // $1 = es global, $2 = instituciones administradas. Se repiten en todas las subconsultas.
        const values = [ctx.esGlobal, ctx.institucionesIds];
        const alcancePublicacion = `($1 OR p.institucion_id = ANY($2::uuid[]))`;
        const alcanceUsuario = `($1 OR EXISTS (
            SELECT 1 FROM usuarios_instituciones ui
            WHERE ui.usuario_id = u.id AND ui.institucion_id = ANY($2::uuid[])
        ))`;
        const alcanceInstitucion = `($1 OR i.id = ANY($2::uuid[]))`;

        const totalesSql = `
            SELECT
                (SELECT COUNT(*) FROM usuarios u WHERE ${alcanceUsuario})::int AS usuarios_total,
                (SELECT COUNT(*) FROM usuarios u
                  WHERE ${alcanceUsuario}
                    AND u.created_at >= NOW() - INTERVAL '30 days')::int AS usuarios_nuevos_30d,
                (SELECT COUNT(*) FROM instituciones i WHERE ${alcanceInstitucion})::int AS instituciones_total,
                (SELECT COUNT(*) FROM categorias)::int AS categorias_total,
                pub.*
            FROM (
                SELECT
                    COUNT(*) FILTER (WHERE p.estado = 'activa')::int AS publicaciones_activas,
                    COUNT(*) FILTER (WHERE p.estado = 'recuperada')::int AS publicaciones_recuperadas,
                    COUNT(*) FILTER (WHERE p.estado = 'eliminada')::int AS publicaciones_eliminadas,
                    COUNT(*) FILTER (WHERE p.estado <> 'eliminada' AND p.tipo = 'perdido')::int AS publicaciones_perdidos,
                    COUNT(*) FILTER (WHERE p.estado <> 'eliminada' AND p.tipo = 'encontrado')::int AS publicaciones_encontrados,
                    COUNT(*) FILTER (
                        WHERE p.estado <> 'eliminada'
                          AND p.created_at >= NOW() - INTERVAL '30 days'
                    )::int AS publicaciones_nuevas_30d
                FROM publicaciones p
                WHERE ${alcancePublicacion}
            ) pub
        `;

        // Publicaciones creadas por día en las últimas 2 semanas (hora de Argentina)
        const serieSql = `
            WITH dias AS (
                SELECT generate_series(
                    (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - 13,
                    (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
                    INTERVAL '1 day'
                )::date AS dia
            )
            SELECT
                to_char(d.dia, 'YYYY-MM-DD') AS fecha,
                COUNT(p.id) FILTER (WHERE p.tipo = 'perdido')::int AS perdidos,
                COUNT(p.id) FILTER (WHERE p.tipo = 'encontrado')::int AS encontrados
            FROM dias d
            LEFT JOIN publicaciones p
                ON (p.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date = d.dia
               AND p.estado <> 'eliminada'
               AND ${alcancePublicacion}
            GROUP BY d.dia
            ORDER BY d.dia ASC
        `;

        const recientesSql = `
            SELECT
                p.id, p.nombre, p.tipo, p.estado, p.created_at,
                i.nombre AS institucion_nombre,
                c.nombre AS categoria_nombre
            FROM publicaciones p
            LEFT JOIN instituciones i ON i.id = p.institucion_id
            LEFT JOIN categorias c ON c.id = p.categoria_id
            WHERE ${alcancePublicacion}
            ORDER BY p.created_at DESC NULLS LAST
            LIMIT 5
        `;

        const institucionesSql = `
            SELECT
                i.id, i.nombre,
                COUNT(p.id) FILTER (WHERE p.estado = 'activa')::int AS publicaciones_activas,
                COUNT(p.id) FILTER (WHERE p.estado = 'recuperada')::int AS publicaciones_recuperadas
            FROM instituciones i
            LEFT JOIN publicaciones p ON p.institucion_id = i.id
            WHERE ${alcanceInstitucion}
            GROUP BY i.id, i.nombre
            ORDER BY publicaciones_activas DESC, i.nombre ASC
            LIMIT 5
        `;

        const [totales, serie, recientes, instituciones] = await Promise.all([
            this.db.queryOne(totalesSql, values),
            this.db.queryAll(serieSql, values),
            this.db.queryAll(recientesSql, values),
            this.db.queryAll(institucionesSql, values)
        ]);

        return {
            totales,
            serie_publicaciones: serie,
            publicaciones_recientes: recientes,
            instituciones_destacadas: instituciones
        };
    };
}

export default new AdminRepository();
