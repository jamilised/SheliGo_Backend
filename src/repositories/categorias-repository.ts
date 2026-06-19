import DbPg from '../database/db-pg.js'

class CategoríasRepository {
    db = new DbPg()

    getAll = async () => {
        const sql = `
            SELECT id, nombre, descripcion, icono
            FROM categorias
            ORDER BY nombre ASC
        `;
        return await this.db.queryAll(sql);
    }
}

export default new CategoríasRepository();