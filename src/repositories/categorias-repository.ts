import DbPg from '../database/db-pg.js';

class CategoriasRepository {
    db = new DbPg();

    getAll = async () => {
        try {
            const sql = `
                SELECT id, nombre, descripcion
                FROM categorias
                ORDER BY nombre ASC
            `;
            return await this.db.queryAll(sql);
        } catch (error) {
            console.error('❌ ERROR REAL EN POSTGRES (CATEGORIAS):', error);
            return null;
        }
    }
}

export default new CategoriasRepository(); // 🚀 Todo sin tildes y seguro