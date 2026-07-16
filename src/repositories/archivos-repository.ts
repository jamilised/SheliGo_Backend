import DbPg from '../database/db-pg.js'

class ArchivosRepository {
    db = new DbPg()

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

    // Eliminar un archivo específico por su ID
    deleteById = async (id: string) => {
        const sql = `
            DELETE FROM archivos
            WHERE id = $1
            RETURNING *
        `;
        return await this.db.queryOne(sql, [id]);
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