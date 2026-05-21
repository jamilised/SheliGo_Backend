import type { Request, Response } from 'express'
import PublicacionesService
from '../services/publicaciones.service.js'

class PublicacionesController {

    getPublicacionDetalle = async (
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

            if (!publicacion) {
                return res.status(404).json({
                    error: 'Publicación no encontrada'
                })
            }

            return res.status(200).json(publicacion)

        } catch (error) {

            return res.status(500).json({
                error: 'Error interno'
            })

        }

    }

}

export default new PublicacionesController()