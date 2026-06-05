import DbPg from './db-pg.js'

class PublicacionesRepository {

    db = new DbPg()

    getById = async (id: string) => {

    const sql = `
        SELECT
            p.*,
            u.nombre AS usuario_nombre,
            u.apellido AS usuario_apellido,
            u.foto AS usuario_foto,
            c.nombre AS categoria_nombre,
            i.nombre AS institucion_nombre,
            i.direccion AS institucion_direccion
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

    return result
}

getRecent = async () => {
        console.log('EJECUTANDO: getRecent')
        console.log('DB HOST:', process.env.DB_HOST)
        console.log('DB DATABASE:', process.env.DB_DATABASE)
        console.log('DB USER:', process.env.DB_USER)

        const sql = `
            SELECT 
                p.id, 
                p.nombre, 
                p.descripcion, 
                p.fecha_evento,
                p.tipo, 
                p.estado,
                p.lugar_institucion,
                i.nombre AS institucion_nombre,
                i.direccion AS institucion_direccion,
                a.url AS foto_principal_url,
                a.mime_type AS foto_principal_mime_type
            FROM publicaciones p
            LEFT JOIN instituciones i 
                ON i.id = p.institucion_id
            LEFT JOIN LATERAL (
                SELECT url, mime_type
                FROM archivos
                WHERE publicacion_id = p.id
                ORDER BY es_principal DESC, created_at DESC
                LIMIT 1
            ) a ON true
            ORDER BY p.fecha_evento DESC 
            LIMIT 15
        `

        const result =
            await this.db.queryAll(sql)

        console.log('RESULTADO QUERY RECIENTES:', result)

        return result
    }

}

export default PublicacionesRepository