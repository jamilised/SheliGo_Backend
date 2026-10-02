import type { Request, Response, NextFunction } from 'express';
import authService from '../services/auth-service.js';
import jwt from 'jsonwebtoken';

const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        
        const resultado = await authService.login(email, password);

        return res.status(200).json({
            status: 'success',
            data: resultado
        });
    } catch (error) {
        return next(error);
    }
};

const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('CONTROLLER AUTH: Iniciando registro');
        
        const nuevoUsuario = await authService.register(req.body, req.files);

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
        });
    } catch (error) {
        return next(error);
    }
};

const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return res.status(200).json({
            status: 'success',
            message: 'Sesión cerrada exitosamente'
        });
    } catch (error) {
        return next(error);
    }
};

// auth-controller.ts
const loginConGoogle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const tokenSupabase = authHeader?.split(' ')[1];

        if (!tokenSupabase) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'No se proporcionó el token de Supabase.' 
            });
        }

        const resultado = await authService.loginConGoogle(tokenSupabase);

        return res.status(200).json({
            status: 'success',
            data: resultado
        });
    } catch (error) {
        return next(error);
    }
};

const asociarInstituciones = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // El authMiddleware guarda el ID del usuario acá
        const userId = res.locals.userIdLogged;

        if (!userId) {
            return res.status(401).json({
                status: "error",
                message: "No se pudo identificar al usuario autenticado."
            });
        }

        const { instituciones_ids } = req.body;

        if (
            !Array.isArray(instituciones_ids) ||
            instituciones_ids.length === 0
        ) {
            return res.status(400).json({
                status: "error",
                message: "Debes seleccionar al menos una institución."
            });
        }

        console.log("Usuario autenticado:", userId);
        console.log("Instituciones recibidas:", instituciones_ids);

        const instituciones =
            await authService.asociarInstitucionesGoogle(
                userId,
                instituciones_ids
            );

        return res.status(200).json({
            status: "success",
            message: "Instituciones asociadas correctamente",
            data: {
                instituciones
            }
        });
    } catch (error) {
        return next(error);
    }
};

// Cumple regla: Objeto con funciones para Controllers
export default {
    login,
    register,
    logout,
    loginConGoogle,
    asociarInstituciones
};