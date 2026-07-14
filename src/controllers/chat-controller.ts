import type { Request, Response, NextFunction } from 'express';
import ChatService from '../services/chat-service.js';

const abrirOCrearChat = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const usuarioLogueadoId = res.locals.userIdLogged as string;
        const { otroUsuarioId } = req.body;

        if (!otroUsuarioId) {
            return res.status(400).json({
                status: 'error',
                message: 'El ID del otro usuario es obligatorio.'
            });
        }

        const sala = await ChatService.obtenerOCrearSala(usuarioLogueadoId, otroUsuarioId as string);

        return res.status(200).json({
            status: 'success',
            data: sala
        });
    } catch (error) {
        return next(error);
    }
};

const getMensajesSala = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const usuarioId = res.locals.userIdLogged as string;
        const salaId = req.params.id as string; 

        if (!salaId) {
            return res.status(400).json({
                status: 'error',
                message: 'El ID de la sala es obligatorio.'
            });
        }

        const mensajes = await ChatService.obtenerMensajesSala(salaId, usuarioId);

        return res.status(200).json({
            status: 'success',
            data: mensajes
        });
    } catch (error) {
        return next(error);
    }
};

const enviarMensaje = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const emisorId = res.locals.userIdLogged as string;
        const { sala_id, contenido } = req.body;

        if (!sala_id || !contenido) {
            return res.status(400).json({
                status: 'error',
                message: 'Faltan campos obligatorios: sala_id o contenido.'
            });
        }

        const nuevoMensaje = await ChatService.guardarMensaje(sala_id as string, emisorId, contenido as string);

        return res.status(201).json({
            status: 'success',
            data: nuevoMensaje
        });
    } catch (error) {
        return next(error);
    }
    
};

const getMisSalas = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const usuarioId = res.locals.userIdLogged as string; 
        
        // 🚀 Leemos el query parameter de la URL (ej: /api/chat/salas?filtro=no_leidas)
        const filtro = req.query.filtro as string | undefined;

        const salas = await ChatService.obtenerMisSalas(usuarioId, filtro);

        return res.status(200).json({
            status: 'success',
            data: salas
        });
    } catch (error) {
        return next(error);
    }
};

const eliminarMensaje = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const usuarioId = res.locals.userIdLogged as string;
        const { id: mensajeId } = req.params;

        if (!mensajeId) {
            return res.status(400).json({
                status: 'error',
                message: 'El ID del mensaje es obligatorio.'
            });
        }

        const mensajeEliminado = await ChatService.eliminarMensaje(mensajeId as string, usuarioId);

        return res.status(200).json({
            status: 'success',
            message: 'Mensaje eliminado correctamente.',
            data: mensajeEliminado
        });
    } catch (error) {
        return next(error);
    }
};

export default {
    getMisSalas,
    abrirOCrearChat,
    getMensajesSala,
    enviarMensaje,
    eliminarMensaje
};