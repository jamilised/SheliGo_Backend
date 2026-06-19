import type { Request, Response, NextFunction } from 'express';
import usuariosService from '../services/usuarios-service.js';

const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('⚡ CONTROLLER USUARIOS: Obteniendo perfil logueado (/me)');
        const userId = res.locals.userIdLogged;

        const perfil = await usuariosService.getPerfil(userId);

        return res.status(200).json({
            status: 'success',
            data: {
                usuario: perfil
            }
        });
    } catch (error) {
        return next(error);
    }
};

// Cumple regla: Objeto con funciones flecha para Controllers
export default {
    getMe
};