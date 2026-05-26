import type {
    Request,
    Response
} from 'express'

import PreguntasService
from '../services/preguntas-service.js'

const getPreguntas = async (
    req: Request,
    res: Response
) => {

    try {

        const id = req.params.id

        if (
            !id ||
            Array.isArray(id)
        ) {

            return res.status(400).json({
                error: 'ID inválido'
            })

        }

        const preguntas =
            await PreguntasService
                .getPreguntas(id)

        return res.status(200).json(
            preguntas
        )

    } catch (error: any) {

        return res.status(
            error.statusCode || 500
        ).json({
            error:
                error.message ||
                'Error interno'
        })

    }

}

const createPregunta = async (
    req: Request,
    res: Response
) => {

    try {

        const id = req.params.id

        const {
            usuario_id,
            pregunta
        } = req.body

        if (
            !id ||
            Array.isArray(id)
        ) {

            return res.status(400).json({
                error: 'ID inválido'
            })

        }

        const nuevaPregunta =
            await PreguntasService
                .createPregunta(
                    id,
                    usuario_id,
                    pregunta
                )

        return res.status(201).json(
            nuevaPregunta
        )

    } catch (error: any) {

        return res.status(
            error.statusCode || 500
        ).json({
            error:
                error.message ||
                'Error interno'
        })

    }

}

export default {
    getPreguntas,
    createPregunta
}