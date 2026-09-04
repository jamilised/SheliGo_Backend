import DbPg from '../database/db-pg.js';

class InstitucionesRepository {

    db = new DbPg();

    // Trae id y nombre ordenados alfabéticamente para selects/desplegables
    getParaSelector = async () => {
        const sql = `
            SELECT id, nombre
            FROM instituciones
            ORDER BY nombre ASC
        `;

        return await this.db.queryAll(sql);
    };

    // Traemos las instituciones más recientes
    getRecent = async () => {
        console.log('EJECUTANDO: getRecent en InstitucionesRepository');

        const sql = `
            SELECT 
                id, 
                nombre,
                email, 
                direccion, 
                telefono,
                foto
            FROM instituciones
            ORDER BY created_at DESC
            LIMIT 15
        `;

        return await this.db.queryAll(sql);
    };

    // Traemos absolutamente todas las instituciones con datos completos
    getAll = async () => {
        const sql = `
            SELECT id, nombre, email, direccion, telefono, foto
            FROM instituciones
            ORDER BY nombre ASC
        `;
        return await this.db.queryAll(sql);
    };

    getById = async (id: string) => {
        const sql = `
            SELECT id
            FROM instituciones
            WHERE id = $1
        `;

        return await this.db.queryOne(sql, [id]);
    };
}

export default new InstitucionesRepository();