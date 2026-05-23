import type { Request, Response, NextFunction } from 'express'
import PublicacionesService from '../services/publicaciones.service.js'
import InstitucionesService from '../services/instituciones-service.js'
import UsuariosService from '../services/usuarios-service.js'

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

const getHomeData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('--- ENTRANDO A getHomeData EN CONTROLLER ---')
        
        const userId = req.body.userIdLogged
        console.log('ID USUARIO LOGUEADO DESDE MIDDLEWARE:', userId)

        // Traemos todo en paralelo usando Promise.all
        const [publicaciones, instituciones, usuario] = await Promise.all([
            PublicacionesService.getRecentPublicaciones(),
            InstitucionesService.getRecentInstituciones(),
            UsuariosService.getPerfil(userId)
        ])

        console.log('DATOS RECOLECTADOS CON EXITO')

        // Devolvemos la respuesta con la estructura limpia
        return res.status(200).json({
            status: 'success',
            data: {
                usuario,
                publicaciones,
                instituciones
            }
        })

    } catch (error) {
        console.log('ERROR EN getHomeData:', error)
        // Le pasamos el error a express para que use AppError y LogHelper
        return next(error)
    }
}

export default {
    getPublicacionDetalle,
    getHomeData
}