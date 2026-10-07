import type { PoolClient } from 'pg';
import dbPg from '../database/db-pg.js';
import { SqlFiltros } from '../helpers/sql-filtros-helper.js';
import { buildIlikePattern } from '../helpers/sql-search-helper.js';
import { PaginationHelper } from '../helpers/pagination-helper.js';
import type { AdminContext } from '../types/admin-types.js';
import type { AdminListaQuery } from '../validations/admin-schema.js';

class AdminCategoriasRepository {
    db = dbPg;

    // Las categorías son globales; los contadores respetan el alcance del administrador
    listar = async (ctx: AdminContext, filtros: AdminListaQuery) => {
        const f = new SqlFiltros();

        if (filtros.search) {
            const patron = f.param(buildIlikePattern(filtros.search));
            f.agregar(`(c.nombre ILIKE ${patron} OR c.descripcion ILIKE ${patron})`);
        }

        const where = f.where();
        const totalRow = await this.db.queryOne(
            `SELECT COUNT(*)::int AS total FROM categorias c ${where}`,
            f.values
        );

        // El alcance solo afecta a los contadores, por eso se agrega después del total
        const alcance = ctx.esGlobal
            ? ''
            : `AND p.institucion_id = ANY(${f.param(ctx.institucionesIds)}::uuid[])`;
        const limite = f.param(filtros.limit);
        const desplazamiento = f.param(PaginationHelper.offset(filtros.page, filtros.limit));

        const items = await this.db.queryAll(
            `SELECT c.id, c.nombre, c.descripcion,
                (SELECT COUNT(*) FROM publicaciones p
                  WHERE p.categoria_id = c.id AND p.estado = 'activa' ${alcance})::int AS publicaciones_activas,
                (SELECT COUNT(*) FROM publicaciones p
                  WHERE p.categoria_id = c.id ${alcance})::int AS publicaciones_total
             FROM categorias c
             ${where}
             ORDER BY c.nombre ASC, c.id
             LIMIT ${limite} OFFSET ${desplazamiento}`,
            f.values
        );

        return { items, total: totalRow?.total ?? 0 };
    };

    // ---------- Operaciones dentro de una transacción ----------

    bloquear = async (client: PoolClient, id: string) => {
        const result = await client.query<{ id: string; nombre: string; descripcion: string | null }>(
            `SELECT id, nombre, descripcion FROM categorias WHERE id = $1 FOR UPDATE`,
            [id]
        );
        return result.rows[0] ?? null;
    };

    /*
    La tabla no tiene índice único por nombre, así que se valida acá
    (sin distinguir mayúsculas) para evitar categorías duplicadas.
    */
    existeNombre = async (client: PoolClient, nombre: string, excluirId: string | null) => {
        const result = await client.query(
            `SELECT 1 FROM categorias
             WHERE lower(nombre) = lower($1) AND ($2::uuid IS NULL OR id <> $2::uuid)
             LIMIT 1`,
            [nombre, excluirId]
        );
        return (result.rowCount ?? 0) > 0;
    };

    crear = async (client: PoolClient, id: string, nombre: string, descripcion: string | null) => {
        const result = await client.query(
            `INSERT INTO categorias (id, nombre, descripcion)
             VALUES ($1, $2, $3)
             RETURNING id, nombre, descripcion`,
            [id, nombre, descripcion]
        );
        return result.rows[0];
    };

    actualizar = async (client: PoolClient, id: string, nombre: string, descripcion: string | null) => {
        const result = await client.query(
            `UPDATE categorias SET nombre = $2, descripcion = $3
             WHERE id = $1
             RETURNING id, nombre, descripcion`,
            [id, nombre, descripcion]
        );
        return result.rows[0];
    };

    // publicaciones.categoria_id es ON DELETE RESTRICT: incluye las eliminadas
    contarPublicaciones = async (client: PoolClient, id: string): Promise<number> => {
        const result = await client.query<{ total: number }>(
            `SELECT COUNT(*)::int AS total FROM publicaciones WHERE categoria_id = $1`,
            [id]
        );
        return result.rows[0]?.total ?? 0;
    };

    eliminar = async (client: PoolClient, id: string) => {
        await client.query(`DELETE FROM categorias WHERE id = $1`, [id]);
    };
}

export default new AdminCategoriasRepository();
