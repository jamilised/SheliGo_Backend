import DbPg from './db-pg.js'

export default class PreguntasRepository {

    db = new DbPg()

    getByPublicacionId = async (
        publicacionId: string
    ) => {

        const sql = `
            SELECT
                id,
                publicacion_id,
                usuario_id,
                pregunta,
                created_at
            FROM preguntas
            WHERE publicacion_id = $1
            ORDER BY created_at DESC
        `

        return await this.db.queryAll(
            sql,
            [publicacionId]
        )

    }

    create = async (
        publicacionId: string,
        usuarioId: string,
        pregunta: string
    ) => {

        const sql = `
            INSERT INTO preguntas (
                publicacion_id,
                usuario_id,
                pregunta
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
                pregunta
            ]
        )

    }

}