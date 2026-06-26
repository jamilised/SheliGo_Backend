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
}

export default new ArchivosRepository(); // 🚀 Instancia directa