import type { Request, Response, NextFunction } from 'express'
import authService from '../services/register-service.js'

class AuthController {

    register = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            console.log('INGRESO AL CONTROLLER: POST /auth/register')
            console.log('DATOS RECIBIDOS EN BODY:', req.body)
            
            // Evaluamos si llegaron archivos en el Form Data
            const cantidadArchivos = req.files ? (req.files as any).length : 0
            console.log(`CANTIDAD DE ARCHIVOS EN REQ.FILES: ${cantidadArchivos}`)

            // Le delegamos toda la lógica pesada al servicio
            const nuevoUsuario = await authService.register(req.body, req.files)

            console.log('REGISTRO EXITOSO EN CONTROLLER, ENVIANDO RESPUESTA AL FRONT')

            // Respuesta estructurada con éxito total
            return res.status(201).json({
                status: 'success',
                message: 'Usuario registrado correctamente',
                data: {
                    usuario: {
                        id: nuevoUsuario.id,
                        nombre: nuevoUsuario.nombre,
                        apellido: nuevoUsuario.apellido,
                        email: nuevoUsuario.email,
                        rol: nuevoUsuario.rol,
                        foto: nuevoUsuario.foto
                    }
                }
            })

        } catch (error) {
            console.error('ERROR DETECTADO EN AUTH CONTROLLER:', error)
            
            // Mandamos el error al middleware global de Express (AppError)
            return next(error)
        }
    }
}

export default new AuthController()