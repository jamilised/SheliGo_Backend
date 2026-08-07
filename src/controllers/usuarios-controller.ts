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

const cambiarContrasena = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const usuarioId = res.locals.userIdLogged; // ID extraído del token JWT en authMiddleware
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

// Cumple regla: Objeto con funciones flecha para Controllers
export default {
    getMe,
    cambiarContrasena
};