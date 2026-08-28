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

}

export default new NotificacionesRepository();