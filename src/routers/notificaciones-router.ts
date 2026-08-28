import { Router } from 'express';

import notificacionesController
    from '../controllers/notificaciones-controller.js';

import {
    authMiddleware
} from '../middlewares/auth-middleware.js';


const router = Router();


router.get(

    '/',

    authMiddleware,

    notificacionesController
        .getMisNotificaciones

);


export default router;