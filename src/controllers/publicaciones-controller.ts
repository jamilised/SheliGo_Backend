import type { Request, Response, NextFunction } from 'express'
import PublicacionesService from '../services/publicaciones-service.js'

const getPublicacionDetalle = async (
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

        const publicacion =
            await PublicacionesService.getDetalle(id)

        return res.json(publicacion)

    } catch (error: any) {

        return res.status(
            error.statusCode || 500
        ).json({
            error: error.message
        })

    }

}

export default {
    getPublicacionDetalle
}