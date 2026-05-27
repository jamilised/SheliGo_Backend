import type {
    Request,
    Response
} from 'express'

import ArchivosService
from '../services/archivos-service.js'

const getPublicacionArchivos = async (
    req: Request,
    res: Response
) => {

    try {

        const id = req.params.id

        if (!id || Array.isArray(id)) {

            return res.status(400).json({
                error: 'ID inválido'
            })

        }

        const archivos =
            await ArchivosService
                .getArchivos(id)

        return res.status(200).json(
            archivos
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
    getPublicacionArchivos
}