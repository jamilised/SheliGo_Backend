import type { Request, Response, NextFunction } from 'express';
import authService from '../services/auth-service.js';
import AppError from '../errors/app-error.js';

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
        const nuevoUsuario = await authService.register(req.body, req.file);

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

const asociarInstituciones = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId: unknown = res.locals.userIdLogged;
        const { instituciones_ids } = req.body;

        if (typeof userId !== 'string' || !userId) {
            return next(new AppError('Usuario no autenticado', 401));
        }

        const instituciones = await authService.asociarInstitucionesGoogle(userId, instituciones_ids);

        return res.status(200).json({
            status: 'success',
            message: 'Instituciones asociadas correctamente',
            data: { instituciones }
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