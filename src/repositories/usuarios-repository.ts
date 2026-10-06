import dbPg from '../database/db-pg.js'
import Usuario from '../entities/usuario.js';
import type { PoolClient } from 'pg'

class UsuariosRepository {

    db = dbPg

    getById = async (id: string) => {
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

        return await this.db.queryOne(sql, [id])
    }

    getByEmail = async (email: string) => {
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

        return await this.db.queryOne(sql, [email]);
    }

    create = async (u: {
        id?: string;
        nombre: string;
        apellido: string;
        email: string;
        telefono: string | null;
        rol: string;
        password_hash: string | null;
    }, client?: PoolClient) => {
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

        const res = client
            ? (await client.query(sql, values)).rows[0] ?? null
            : await this.db.queryOne(sql, values);
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

    createWithInstitutions = async (
        usuario: {
            id: string;
            nombre: string;
            apellido: string;
            email: string;
            telefono: string | null;
            rol: string;
            password_hash: string | null;
        },
        institucionesIds: string[],
        fotoPath: string
    ) => this.db.transaction(async (client) => {
        const nuevoUsuario = await this.create(usuario, client);
        if (!nuevoUsuario) {
            throw new Error('No se pudo crear el usuario dentro de la transacción.');
        }

        await this.asociarInstituciones(usuario.id, institucionesIds, client);

        const fotoActualizada = await client.query(
            `UPDATE usuarios
             SET foto = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING foto`,
            [fotoPath, usuario.id]
        );
        if (fotoActualizada.rowCount !== 1) {
            throw new Error('No se pudo asignar la foto al usuario dentro de la transacción.');
        }

        nuevoUsuario.foto = fotoPath;
        const instituciones = await client.query(
            `SELECT i.id, i.nombre, i.direccion, i.foto
             FROM instituciones i
             JOIN usuarios_instituciones ui ON ui.institucion_id = i.id
             WHERE ui.usuario_id = $1`,
            [usuario.id]
        );

        return { usuario: nuevoUsuario, instituciones: instituciones.rows };
    });

    updateFoto = async (
        id: string,
        fotoPath: string
    ) => {

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

    asociarInstituciones = async (
        usuarioId: string,
        institucionesIds: string[],
        client?: PoolClient
    ) => {
        const idsUnicos = [...new Set(institucionesIds ?? [])];
        if (idsUnicos.length === 0) return;

        const values: any[] = [usuarioId];
        const valueTuples = idsUnicos.map((instId, index) => {
            values.push(instId);
            return `(CURRENT_DATE, $1, $${index + 2})`;
        }).join(', ');

        const sql = `
        INSERT INTO usuarios_instituciones (fecha_union, usuario_id, institucion_id)
        VALUES ${valueTuples}
    `;

        if (client) {
            await client.query(sql, values);
        } else {
            await this.db.getDBPool().query(sql, values);
        }
    };

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

        return await this.db.queryAll(sql, [usuarioId]);
    };

    reemplazarInstituciones = async (usuarioId: string, institucionesIds: string[]) => {
        await this.db.transaction(async (client) => {
            await client.query(
                `DELETE FROM usuarios_instituciones WHERE usuario_id = $1`,
                [usuarioId]
            );
            await this.asociarInstituciones(usuarioId, institucionesIds, client);
        });
    };
}

export default new UsuariosRepository