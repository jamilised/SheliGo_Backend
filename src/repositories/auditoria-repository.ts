import type { PoolClient } from 'pg';
import dbPg from '../database/db-pg.js';
import type { AdminContext, AuditoriaEntrada } from '../types/admin-types.js';

class AuditoriaRepository {
    db = dbPg;

    /*
    Se registra con el mismo client de la transacción de la acción: si la
    acción falla no queda auditoría, y si la auditoría falla la acción se revierte.
    */
    registrar = async (client: PoolClient, entrada: AuditoriaEntrada): Promise<void> => {
        await client.query(
            `INSERT INTO auditoria_admin
                (admin_id, accion, entidad, entidad_id, institucion_id, detalle)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                entrada.adminId,
                entrada.accion,
                entrada.entidad,
                entrada.entidadId,
                entrada.institucionId,
                entrada.detalle === null ? null : JSON.stringify(entrada.detalle)
            ]
        );
    };

    /*
    Últimas acciones visibles para el administrador.
    - admin: todas (o las de la institución pedida, si acotó el dashboard).
    - institution_admin: solo movimientos hechos por usuarios que pertenecen a
      alguna de sus instituciones Y sobre esas mismas instituciones. Así no ve
      la actividad del resto del equipo de la plataforma (p. ej. del admin general).
    */
    getRecientes = async (ctx: AdminContext, limit: number) => {
        const soloMiembros = ctx.rol === 'institution_admin';
        const sql = `
            SELECT
                a.id, a.accion, a.entidad, a.entidad_id, a.institucion_id,
                a.detalle, a.created_at,
                u.nombre AS admin_nombre,
                u.apellido AS admin_apellido,
                i.nombre AS institucion_nombre
            FROM auditoria_admin a
            INNER JOIN usuarios u ON u.id = a.admin_id
            LEFT JOIN instituciones i ON i.id = a.institucion_id
            WHERE ($1 OR a.institucion_id = ANY($2::uuid[]))
              AND (NOT $3 OR EXISTS (
                    SELECT 1 FROM usuarios_instituciones ui
                    WHERE ui.usuario_id = a.admin_id
                      AND ui.institucion_id = ANY($2::uuid[])
              ))
            ORDER BY a.created_at DESC
            LIMIT $4
        `;
        return await this.db.queryAll(sql, [ctx.esGlobal, ctx.institucionesIds, soloMiembros, limit]);
    };
}

export default new AuditoriaRepository();
