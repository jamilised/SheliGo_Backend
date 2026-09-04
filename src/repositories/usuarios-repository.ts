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

        console.log(
            'EJECUTANDO: getByEmail en UsuariosRepository para:',
            email
        );

        const sql = `
            SELECT 
                id, 
                nombre,
                apellido,
                email, 
                password_hash,
                foto
            FROM usuarios 
            WHERE email = $1
        `;

        const result =
            await this.db.queryOne(sql, [email]);

        console.log(
            'RESULTADO QUERY EMAIL:',
            result ? 'Existe' : 'No existe'
        );

        return result;
    }

    // Inserta el nuevo usuario y retorna la Entidad Usuario real
    // usuarios-repository.ts
    create = async (u: {
        id?: string;
        nombre: string;
        apellido: string;
        email: string;
        telefono: string | null;
        rol: string;
        password_hash: string | null;
    }) => {
        // Si viene ID (Google/Supabase) lo incluimos; si no, dejamos que PostgreSQL lo genere o insertamos DEFAULT
        const sql = `
        INSERT INTO usuarios (
            ${u.id ? 'id,' : ''}
            nombre,
            apellido,
            email,
            telefono,
            rol,
            password_hash,
            created_at,
            updated_at
        )
        VALUES (${u.id ? '$1,' : ''} ${u.id ? '$2, $3, $4, $5, $6, $7' : '$1, $2, $3, $4, $5, $6'}, NOW(), NOW())
        RETURNING id, nombre, apellido, email, telefono, created_at, updated_at, rol, foto
    `;

        const values = u.id
            ? [u.id, u.nombre, u.apellido, u.email, u.telefono, u.rol, u.password_hash]
            : [u.nombre, u.apellido, u.email, u.telefono, u.rol, u.password_hash];

        const res = await this.db.queryOne(sql, values);
        if (!res) return null;

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
    updateFoto = async (
        id: string,
        fotoPath: string
    ) => {

        console.log(
            `➡️ EJECUTANDO: updateFoto para ID ${id} con ruta: ${fotoPath}`
        );

        const sql = `
            UPDATE usuarios
            SET
                foto = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING foto
        `;

        return await this.db.queryOne(
            sql,
            [fotoPath, id]
        );
    }

    // Actualiza los datos del perfil
    updatePerfil = async (
        id: string,
        nombre: string,
        apellido: string,
        foto: string
    ) => {

        console.log(
            `EJECUTANDO: updatePerfil para ${id}`
        );

        const sql = `
            UPDATE usuarios
            SET
                nombre = $1,
                apellido = $2,
                foto = $3,
                updated_at = NOW()
            WHERE id = $4
            RETURNING
                id,
                nombre,
                apellido,
                email,
                telefono,
                created_at,
                updated_at,
                rol,
                foto
        `;

        const res = await this.db.queryOne(
            sql,
            [
                nombre,
                apellido,
                foto,
                id
            ]
        );

        if (!res) {
            return null;
        }

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

    // Busca un usuario por ID para operaciones relacionadas
    // con autenticación/contraseña
    async findById(id: string) {

        const sql = `
            SELECT
                id,
                email,
                nombre,
                password_hash
            FROM usuarios
            WHERE id = $1
        `;

        return await this.db.queryOne(
            sql,
            [id]
        );
    }

    // Actualiza la contraseña de un usuario
    async updatePassword(
        id: string,
        newPasswordHash: string
    ) {

        const sql = `
            UPDATE usuarios
            SET
                password_hash = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING id
        `;

        return await this.db.queryOne(
            sql,
            [
                newPasswordHash,
                id
            ]
        );
    }

    // Asocia múltiples instituciones a un usuario
    asociarInstituciones = async (usuarioId: string, institucionesIds: string[]) => {
        if (!institucionesIds || institucionesIds.length === 0) return;

        const values: any[] = [usuarioId];
        const valueTuples = institucionesIds.map((instId, index) => {
            values.push(instId);
            return `(CURRENT_DATE, $1, $${index + 2})`;
        }).join(', ');

        const sql = `
        INSERT INTO usuarios_instituciones (fecha_union, usuario_id, institucion_id)
        VALUES ${valueTuples}
    `;

        // Usamos el pool directamente para ejecutar un INSERT múltiple que no retorna filas
        await this.db.getDBPool().query(sql, values);
    };

    // Obtiene las instituciones asociadas al usuario
    getInstitucionesByUsuarioId = async (usuarioId: string) => {
        const sql = `
        SELECT 
            i.id, 
            i.nombre, 
            i.direccion, 
            i.foto 
        FROM instituciones i
        JOIN usuarios_instituciones ui ON ui.institucion_id = i.id
        WHERE ui.usuario_id = $1
    `;

        // Usamos queryAll ya expuesto por DbPg
        return await this.db.queryAll(sql, [usuarioId]);
    };

    // Agregar al final de la clase UsuariosRepository en usuarios-repository.ts

    // Reemplaza todas las instituciones del usuario por la nueva lista
    reemplazarInstituciones = async (usuarioId: string, institucionesIds: string[]) => {
        // 1. Eliminamos las asociaciones anteriores
        const sqlDelete = `DELETE FROM usuarios_instituciones WHERE usuario_id = $1`;
        await this.db.getDBPool().query(sqlDelete, [usuarioId]);

        // 2. Asociamos las nuevas si el array no está vacío
        if (institucionesIds && institucionesIds.length > 0) {
            await this.asociarInstituciones(usuarioId, institucionesIds);
        }
    };
}

export default new UsuariosRepository