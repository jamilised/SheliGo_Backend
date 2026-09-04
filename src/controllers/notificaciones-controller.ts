import type {
    Request,
    Response,
    NextFunction
} from 'express';

import notificacionesService
    from '../services/notificaciones-service.js';


const getMisNotificaciones = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    try {

        const usuarioId =
            res.locals.userIdLogged;


        const notificaciones =
            await notificacionesService
                .getMisNotificaciones(
                    usuarioId
                );


        return res.status(200).json({

            status: "success",

            data: {
                notificaciones
            }

        });

    } catch (error) {

        return next(error);

    }

};

const marcarComoLeida = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    try {

        const notificacionId =
            req.params.id as string;

        const usuarioId =
            res.locals.userIdLogged;

        const notificacion =
            await notificacionesService
                .marcarComoLeida(
                    notificacionId,
                    usuarioId
                );

        return res.status(200).json({

            status: "success",

            message:
                "Notificación marcada como leída",

            data: {
                notificacion
            }

        });

    } catch (error) {

        return next(error);

    }

};

const marcarTodasComoLeidas = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    try {

        const usuarioId =
            res.locals.userIdLogged;

        const resultado =
            await notificacionesService
                .marcarTodasComoLeidas(
                    usuarioId
                );

        return res.status(200).json({

            status: "success",

            message:
                "Todas las notificaciones fueron marcadas como leídas",

            data: resultado

        });

    } catch (error) {

        return next(error);

    }

};

export default {
    getMisNotificaciones,
    marcarComoLeida,
    marcarTodasComoLeidas
};