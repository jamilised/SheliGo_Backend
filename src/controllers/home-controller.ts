import type { Request, Response, NextFunction } from 'express'
import PublicacionesService from '../services/publicaciones-service.js'
import InstitucionesService from '../services/instituciones-service.js'
import UsuariosService from '../services/usuarios-service.js'

// 1. ENDPOINT PARA EL USUARIO
const getHomeUsuario = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {

        const usuario = await UsuariosService.getPerfil(
            process.env.USER_ID_HOME
        )

        return res.status(200).json({
            status: 'success',
            data: { usuario }
        })

    } catch (error) {
        return next(error)
    }
}

// 2. ENDPOINT PARA LAS PUBLICACIONES RECIENTES
const getHomePublicaciones = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {

        const publicaciones =
            await PublicacionesService.getRecentPublicaciones()

        return res.status(200).json({
            status: 'success',
            data: { publicaciones }
        })

    } catch (error) {
        return next(error)
    }
}

// 3. ENDPOINT PARA LAS INSTITUCIONES RECIENTES
const getHomeInstituciones = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {

        const instituciones =
            await InstitucionesService.getRecentInstituciones()

        return res.status(200).json({
            status: 'success',
            data: { instituciones }
        })

    } catch (error) {
        return next(error)
    }
}

export default {
    getHomeUsuario,
    getHomePublicaciones,
    getHomeInstituciones
}