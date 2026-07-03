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

const loginConGoogle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('[AUTH CONTROLLER]: Procesando token de Supabase Google');
        
        const authHeader = req.headers.authorization;
        const tokenSupabase = authHeader?.split(' ')[1];

        if (!tokenSupabase) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'No se proporcionó el token de Supabase en las cabeceras.' 
            });
        }

        // Importamos supabase dinámicamente tal cual lo tenías armado
        const { supabase } = await import('../database/supabase.js'); 
        
        // 1. Validamos el token contra los servidores de Supabase
        const { data: { user }, error } = await supabase.auth.getUser(tokenSupabase);

        if (error || !user) {
            console.error('Token de Google/Supabase inválido:', error?.message);
            return res.status(401).json({ 
                status: 'error', 
                message: 'Token de Google/Supabase inválido o expirado.' 
            });
        }

        // 2. Formateamos el usuario para que coincida exactamente con lo que el frontend espera
        const usuarioFormateado = {
            id: user.id,
            nombre: user.user_metadata.full_name || user.user_metadata.name || 'Usuario de Google',
            foto: user.user_metadata.avatar_url || ''
        };

        // 3. GENERAMOS TU PROPIO TOKEN FIRMADO (El que pasa tu authMiddleware)
        const tuPropioToken = jwt.sign(
            { userId: user.id }, 
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );

        // 4. Devolvemos la respuesta bajo la estructura standar (response.data.data)
        return res.status(200).json({
            status: 'success',
            data: {
                token: tuPropioToken,
                usuario: usuarioFormateado
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
    loginConGoogle
};