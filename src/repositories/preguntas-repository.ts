import DbPg from '../database/db-pg.js'

export default class PreguntasRepository {

    db = new DbPg()

    getByPublicacionId = async (
        publicacionId: string
    ) => {

        const sql = `
          SELECT

            p.id,
            p.publicacion_id,
            p.usuario_id,
            p.contenido,
            p.created_at,

            u.nombre AS usuario_nombre,
            u.apellido AS usuario_apellido,
            u.foto AS usuario_foto,

            r.id AS respuesta_id,
            r.contenido AS respuesta_contenido,
            r.created_at AS respuesta_created_at

            FROM preguntas p

            INNER JOIN usuarios u
                ON u.id = p.usuario_id

            LEFT JOIN respuestas r
                ON r.pregunta_id = p.id

            WHERE p.publicacion_id = $1

            ORDER BY p.created_at DESC
        `

        return await this.db.queryAll(
            sql,
            [publicacionId]
        )

    }

    create = async (
        publicacionId: string,
        usuarioId: string,
        contenido: string
    ) => {

        const sql = `
            INSERT INTO preguntas (
                publicacion_id,
                usuario_id,
                contenido
            )
            VALUES (
                $1,
                $2,
                $3
            )
            RETURNING *
        `

        return await this.db.queryOne(
            sql,
            [
                publicacionId,
                usuarioId,
                contenido
            ]
        )

    }

}