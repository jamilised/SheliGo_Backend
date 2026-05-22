import DbPg from './db-pg.js'

class PublicacionesRepository {

    db = new DbPg()

    getById = async (id: string) => {

    console.log('ID RECIBIDO:', id)
    console.log('DB HOST:', process.env.DB_HOST)
    console.log('DB DATABASE:', process.env.DB_DATABASE)
    console.log('DB USER:', process.env.DB_USER)

    const sql = `
        SELECT
            p.*,
            u.nombre AS usuario_nombre,
            u.apellido AS usuario_apellido,
            c.nombre AS categoria_nombre,
            i.nombre AS institucion_nombre
        FROM publicaciones p
        INNER JOIN usuarios u
            ON u.id = p.usuario_id
        LEFT JOIN categorias c
            ON c.id = p.categoria_id
        LEFT JOIN instituciones i
            ON i.id = p.institucion_id
        WHERE p.id = $1
    `

    const result =
        await this.db.queryOne(sql, [id])

    console.log('RESULTADO QUERY:', result)

    return result
}

}

export default PublicacionesRepository