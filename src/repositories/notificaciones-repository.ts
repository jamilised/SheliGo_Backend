import DbPg from '../database/db-pg.js';

class NotificacionesRepository {

    db = new DbPg();

    create = async (data: {
        usuario_id: string;
        publicacion_id?: string | null;
        tipo: string;
        titulo: string;
        contenido: string;
    }) => {

        const sql = `
            INSERT INTO notificaciones (
                usuario_id,
                publicacion_id,
                tipo,
                titulo,
                contenido,
                leida,
                created_at
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                false,
                NOW()
            )
            RETURNING *
        `;

        return await this.db.queryOne(sql, [
            data.usuario_id,
            data.publicacion_id ?? null,
            data.tipo,
            data.titulo,
            data.contenido
        ]);

    };

    getByUsuarioId = async (
        usuarioId: string
    ) => {

        const sql = `
            SELECT
                id,
                leida,
                created_at,
                updated_at,
                tipo,
                usuario_id,
                publicacion_id,
                titulo,
                contenido
            FROM notificaciones
            WHERE usuario_id = $1
            ORDER BY created_at DESC
        `;

        return await this.db.queryAll(
            sql,
            [usuarioId]
        );

    };

    markAsRead = async (
        notificacionId: string,
        usuarioId: string
    ) => {

        const sql = `
        UPDATE notificaciones
        SET
            leida = true,
            updated_at = NOW()
        WHERE
            id = $1
            AND usuario_id = $2
        RETURNING *
    `;

        return await this.db.queryOne(sql, [
            notificacionId,
            usuarioId
        ]);

    };

    markAllAsRead = async (
        usuarioId: string
    ) => {

        const sql = `
        UPDATE notificaciones
        SET
            leida = true,
            updated_at = NOW()
        WHERE
            usuario_id = $1
            AND leida = false
        RETURNING id
    `;

        return await this.db.queryAll(sql, [
            usuarioId
        ]);

    };

}



export default new NotificacionesRepository();