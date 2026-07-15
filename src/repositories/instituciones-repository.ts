import DbPg from '../database/db-pg.js'

class InstitucionesRepository {

    db = new DbPg()

    // Traemos las instituciones más recientes
    getRecent = async () => {

        console.log('EJECUTANDO: getRecent en InstitucionesRepository')
        console.log('DB HOST:', process.env.DB_HOST)
        console.log('DB DATABASE:', process.env.DB_DATABASE)
        console.log('DB USER:', process.env.DB_USER)

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
        `

        const result =
            await this.db.queryAll(sql)

        console.log('RESULTADO QUERY 15 INSTITUCIONES:', result)

        return result
    }


    // Traemos absolutamente todas las instituciones para los selectores
    getAll = async () => {
        const sql = `
        SELECT id, nombre, email, direccion, telefono, foto
        FROM instituciones
        ORDER BY nombre ASC
    `;
        const result = await this.db.queryAll(sql);
        console.log('RESULTADO QUERY TODAS INSTITUCIONES:', result)
        return result;
    }

    getById = async (id: string) => {

    const sql = `
        SELECT id
        FROM instituciones
        WHERE id = $1
    `;

    return await this.db.queryOne(sql, [id]);

}
}

export default new InstitucionesRepository