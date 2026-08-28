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


export default {
    getMisNotificaciones
};