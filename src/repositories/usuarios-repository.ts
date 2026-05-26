import DbPg from './db-pg.js'

class UsuariosRepository {

    db = new DbPg()

    // Busca un usuario por su ID
    getById = async (id: string) => {

        console.log('EJECUTANDO: getById en UsuariosRepository')
        console.log('ID USUARIO RECIBIDO:', id)
        console.log('DB HOST:', process.env.DB_HOST)
        console.log('DB DATABASE:', process.env.DB_DATABASE)
        console.log('DB USER:', process.env.DB_USER)

        const sql = `
            SELECT 
                id, 
                nombre, 
                apellido, 
                email, 
                telefono,
                created_at,
                foto
            FROM usuarios
            WHERE id = $1
        `

        const result =
            await this.db.queryOne(sql, [id])

        console.log('RESULTADO QUERY USUARIO:', result)

        return result
    }

}

export default UsuariosRepository