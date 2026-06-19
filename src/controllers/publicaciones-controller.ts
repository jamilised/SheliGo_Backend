import type { Request, Response, NextFunction } from 'express'
import PublicacionesService from '../services/publicaciones-service.js'
import { searchPublicacionSchema } from '../validations/publicacion-schema.js';

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

const search = async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log('C1: Iniciando búsqueda de publicaciones con Query Params:', req.query);

            // 1. Validamos lo que viene por la URL
            const validacion = searchPublicacionSchema.safeParse(req.query);
            
            if (!validacion.success) {
                return res.status(400).json({
                    success: false,
                    message: 'Filtros de búsqueda inválidos',
                    errors: validacion.error.format() // Le dice al front exactamente qué mandó mal
                });
            }

            // 2. Si pasó la validación, agarramos los datos limpios
            const filtros = validacion.data;

            // 3. Llamamos al Service
            // 3. Llamamos al Service pasándole los filtros limpios
            const publicaciones = await PublicacionesService.searchPublicaciones(filtros as any);

            // 4. Respondemos con éxito
            return res.status(200).json({
                success: true,
                data: publicaciones
            });

        } catch (error) {
            console.error('ERROR en publicacionesController.search:', error);
            next(error);
        }
    }

export default {
    getPublicacionDetalle,
    search
}