import type { Request, Response, NextFunction } from 'express';
import authService from '../services/auth-service.js';

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
        console.log('⚡ CONTROLLER AUTH: Iniciando registro');
        
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

const loginConGoogle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('🌐 [AUTH CONTROLLER]: Generando URL para OAuth de Google');
        
        // Traemos supabase de forma dinámica acá adentro con const
        const { supabase } = await import('../database/supabase.js'); 
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'http://localhost:5173/oauth/callback', 
                queryParams: {
                    access_type: 'offline',
                    prompt: 'select_account',
                },
            },
        });

        if (error) {
            console.error('❌ Error de Supabase en Google Auth:', error.message);
            return res.status(400).json({ status: 'error', message: error.message });
        }

        return res.status(200).json({
            status: 'success',
            data: { url: data.url }
        });
    } catch (error) {
        return next(error);
    }
};

// Cumple regla: Objeto con funciones flecha para Controllers
export default {
    login,
    register,
    logout,
    loginConGoogle
};