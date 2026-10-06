import type { Request, Response, NextFunction } from 'express';
import usuariosService from '../services/usuarios-service.js';

const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
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

const cambiarContrasena = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const usuarioId = res.locals.userIdLogged;

        const { contrasenaActual, nuevaContrasena } = req.body;

        await usuariosService.cambiarContrasena(
            usuarioId,
            contrasenaActual,
            nuevaContrasena
        );

        return res.status(200).json({
            status: "success",
            message: "Contraseña actualizada correctamente"
        });
    } catch (error) {
        next(error);
    }
};

const editarPerfil = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    try {

        const usuario = await usuariosService.editarPerfil(
            res.locals.userIdLogged,
            req.body,
            req.file
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

export default {
    getMe,
    cambiarContrasena,
    editarPerfil
};