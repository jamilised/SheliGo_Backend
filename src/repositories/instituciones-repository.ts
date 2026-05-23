import DbPg from './db-pg.js'

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

        console.log('RESULTADO QUERY INSTITUCIONES:', result)

        return result
    }

}

export default InstitucionesRepository