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
}

export default new ArchivosRepository(); // 🚀 Instancia directa