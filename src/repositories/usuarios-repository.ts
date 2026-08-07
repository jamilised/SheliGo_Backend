import DbPg from '../database/db-pg.js'
import Usuario from '../entities/usuario.js';

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

    // Busca un usuario por su email para verificar duplicados
    getByEmail = async (email: string) => {
        console.log('EJECUTANDO: getByEmail en UsuariosRepository para:', email);
        const sql = `SELECT 
                        id, 
                        nombre,
                        apellido,
                        email, 
                        password_hash,
                        foto
                    FROM usuarios 
                    WHERE email = $1`;
        const result = await this.db.queryOne(sql, [email]);
        console.log('RESULTADO QUERY EMAIL:', result ? 'Existe' : 'No existe');
        return result;
    }

    // Inserta el nuevo usuario y retorna la Entidad Usuario real
    create = async (u: {
        id?: string;
        nombre: string;
        apellido: string;
        email: string;
        telefono: string | null;
        rol: string;
        password_hash: string | null;
    }) => {
        console.log('EJECUTANDO: create en UsuariosRepository para:', u.email);

        const sql = `
            INSERT INTO usuarios (nombre, apellido, email, telefono, rol, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING id, nombre, apellido, email, telefono, created_at, updated_at, rol, foto
        `;

        const values = [u.nombre, u.apellido, u.email, u.telefono, u.rol, u.password_hash];
        const res = await this.db.queryOne(sql, values);

        console.log('USUARIO INSERTADO EN DB CON ID:', res?.id);

        if (!res) return null;

        // Convertimos el resultado de la base de datos en tu objeto Entity "Usuario"
        return new Usuario(
            res.id,
            res.nombre,
            res.apellido,
            res.email,
            res.telefono,
            res.created_at,
            res.updated_at,
            res.rol,
            res.foto
        );
    }

    // Método para actualizar la ruta de la foto una vez generado el ID
    updateFoto = async (id: string, fotoPath: string) => {
        console.log(`➡️ EJECUTANDO: updateFoto para ID ${id} con ruta: ${fotoPath}`);
        const sql = `UPDATE usuarios SET foto = $1, updated_at = NOW() WHERE id = $2 RETURNING foto`;
        return await this.db.queryOne(sql, [fotoPath, id]);
    }

    // Método para obtener el usuario incluyendo la contraseña hasheada
    async findById(id: string) {
        const sql = `
    SELECT id, email, password
    FROM usuarios
    WHERE id = $1
  `;
        return await this.db.queryOne(sql, [id]);
    }

    // Método para actualizar únicamente la contraseña
    async updatePassword(id: string, newPasswordHash: string) {
        const sql = `
    UPDATE usuarios
    SET password = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id
  `;
        return await this.db.queryOne(sql, [newPasswordHash, id]);
    }
}


export default new UsuariosRepository