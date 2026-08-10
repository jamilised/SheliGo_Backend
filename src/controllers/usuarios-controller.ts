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

const editarPerfil = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    console.log(req.body);
    console.log(req.files);

    try {

        const usuario = await usuariosService.editarPerfil(
            res.locals.userIdLogged,
            req.body,
            req.files
        );

        return res.status(200).json({

            status: "success",

            message: "Perfil actualizado correctamente",

            data: {
                usuario
            }

        });

    } catch (error) {

        return next(error);

    }

};

// Cumple regla: Objeto con funciones flecha para Controllers
export default {
    getMe,
    editarPerfil
};