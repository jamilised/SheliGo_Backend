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
// Token de Supabase (Google) enviado como "Authorization: Bearer <token>"
const getTokenSupabase = (req: Request): string => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        throw new AppError('No se proporcionó el token de Supabase.', 401);
    }
    return token;
};

const loginConGoogle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const resultado = await authService.loginConGoogle(getTokenSupabase(req));

        return res.status(200).json({
            status: 'success',
            data: resultado
        });
    } catch (error) {
        return next(error);
    }
};

// Último paso del registro con Google: recién acá se crea el usuario y se emite la sesión
const asociarInstituciones = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sesion = await authService.completarRegistroGoogle(
            getTokenSupabase(req),
            req.body.instituciones_ids
        );

        return res.status(200).json({
            status: "success",
            message: "Registro completado",
            data: sesion
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