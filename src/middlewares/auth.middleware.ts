import type { Request, Response, NextFunction } from 'express'
import AppError from '../errors/app-error.js'

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        // El Front debería mandar el token en los headers
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Si no viene el token, cortamos la petición acá con un 401 (No autorizado)
            throw new AppError('Acceso denegado. No se proporcionó un token válido.', 401)
        }

        const token = authHeader.split(' ')[1]

        // --- NOTA PARA NOSOTROS ---
        // Acá tu grupo deberá usar JWT (jsonwebtoken) o Supabase Auth para verificar el token real:
        // const decoded = jwt.verify(token, process.env.JWT_SECRET)
        // const userId = decoded.id
        
        // De forma provisoria para probar tu pantalla, simulamos que el token es el mismo ID de usuario:
        const userId = token 

        // Inyectamos el id del usuario en el objeto de la petición (req)
        req.body.userIdLogged = userId

        return next()

    } catch (error) {
        return next(error)
    }
}