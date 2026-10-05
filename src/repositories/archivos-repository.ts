import dbPg from '../database/db-pg.js'

type ArchivoEliminado = {
    id: string;
    publicacion_id: string;
    url: string;
    mime_type: string;
    es_principal: boolean;
    created_at: Date;
};

class ArchivosRepository {
    db = dbPg

    getByPublicacionId = async (publicacionId: string) => {
        const sql = `
            SELECT id, publicacion_id, url, mime_type, es_principal, created_at
            FROM archivos
            WHERE publicacion_id = $1
            ORDER BY es_principal DESC
        `;
        return await this.db.queryAll(sql, [publicacionId]);
    }

    create = async (archivo: {
        publicacion_id: string;
        url: string;
        mime_type: string;
        es_principal: boolean;
    }) => {

        const sql = `
        INSERT INTO archivos (
            publicacion_id,
            url,
            mime_type,
            es_principal
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *
    `;

        return await this.db.queryOne(sql, [
            archivo.publicacion_id,
            archivo.url,
            archivo.mime_type,
            archivo.es_principal
        ]);
    }

    getByIdsForPublication = async (
        ids: string[],
        publicacionId: string,
        usuarioId: string
    ) => {
        const sql = `
            SELECT a.id, a.publicacion_id, a.url, a.mime_type, a.es_principal, a.created_at
            FROM archivos a
            INNER JOIN publicaciones p ON p.id = a.publicacion_id
            WHERE a.id = ANY($1::uuid[])
                AND a.publicacion_id = $2
                AND p.usuario_id = $3
        `;

        const result = await this.db.getDBPool().query<ArchivoEliminado>(
            sql,
            [ids, publicacionId, usuarioId]
        );

        return result.rows;
    };

    deleteById = async (
        id: string,
        publicacionId: string,
        usuarioId: string
    ): Promise<ArchivoEliminado | null> => {
        const sql = `
            DELETE FROM archivos a
            USING publicaciones p
            WHERE a.id = $1
                AND a.publicacion_id = $2
                AND p.id = a.publicacion_id
                AND p.usuario_id = $3
            RETURNING a.id, a.publicacion_id, a.url, a.mime_type, a.es_principal, a.created_at
        `;

        const result = await this.db.getDBPool().query<ArchivoEliminado>(
            sql,
            [id, publicacionId, usuarioId]
        );

        return result.rows[0] ?? null;
    };

    restore = async (archivo: ArchivoEliminado): Promise<boolean> => {
        const sql = `
            INSERT INTO archivos (
                id,
                publicacion_id,
                url,
                mime_type,
                es_principal,
                created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        `;

        const result = await this.db.getDBPool().query(
            sql,
            [
                archivo.id,
                archivo.publicacion_id,
                archivo.url,
                archivo.mime_type,
                archivo.es_principal,
                archivo.created_at
            ]
        );

        return result.rowCount === 1;
    };

    // Desmarcar todas las fotos de una publicación como principales
    desmarcarPrincipales = async (publicacionId: string) => {
        const sql = `
            UPDATE archivos
            SET es_principal = false
            WHERE publicacion_id = $1
            RETURNING id;
        `;
        return await this.db.queryAll(sql, [publicacionId]);
    };

    // Marcar una foto específica como principal
    marcarComoPrincipal = async (archivoId: string) => {
        const sql = `
            UPDATE archivos
            SET es_principal = true
            WHERE id = $1
        `;
        return await this.db.queryOne(sql, [archivoId]);
    };
}

export default new ArchivosRepository(); // 🚀 Instancia directa