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

        // 🚀 2. VERIFICAMOS SI EL USUARIO YA EXISTE EN NUESTRA TABLA
        let usuarioLocal = await authService['usuariosRepo'].getById(user.id);

        // 🚀 3. SI NO EXISTE, LO CREAMOS POR CÓDIGO (PRIMERA VEZ)
        if (!usuarioLocal) {
            console.log(`[AUTH CONTROLLER]: Usuario nuevo detectado (${user.email}). Registrando en tabla usuarios...`);
            
            const fullName = (user.user_metadata.full_name || user.user_metadata.name || 'Usuario Google').trim();
            let primerNombre = fullName;
            let elApellido = ' '; // Espacio vacío por si es requerido

            // Lógica idéntica de separación por espacios
            const espacioIndex = fullName.indexOf(' ');
            if (espacioIndex > 0) {
                primerNombre = fullName.substring(0, espacioIndex);
                elApellido = fullName.substring(espacioIndex + 1);
            }

            usuarioLocal = await authService['usuariosRepo'].create({
                id: user.id, // Forzamos el mismo UID de Supabase
                nombre: primerNombre,
                apellido: elApellido,
                email: user.email!,
                telefono: null, // Queda en null
                rol: 'user', // Forzado a user
                password_hash: null // Al ser de Google no lleva pass
            });

            if (!usuarioLocal) {
                throw new Error('Error al sincronizar el usuario de Google en la base de datos local.');
            }
        }

        // 4. Formateamos la respuesta final utilizando los datos de TU base de datos
        const usuarioFormateado = {
            id: usuarioLocal.id,
            nombre: usuarioLocal.nombre,
            apellido: usuarioLocal.apellido,
            email: usuarioLocal.email,
            rol: usuarioLocal.rol,
            foto: usuarioLocal.foto // Será 'usuarios/default.png'
        };

        // 5. GENERAMOS TU PROPIO TOKEN FIRMADO
        const tuPropioToken = jwt.sign(
            { userId: usuarioLocal.id }, 
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );

        // 6. Devolvemos la respuesta unificada
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