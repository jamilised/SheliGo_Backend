import { Router } from 'express';
import { z } from 'zod';

import notificacionesController from '../controllers/notificaciones-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { validateParams } from '../middlewares/validation-middleware.js';

const router = Router();

const notificacionParamsSchema = z.object({
    id: z.string().uuid('El ID de la notificación no es válido')
});

router.use(authMiddleware);

// GET /notificaciones -> notificaciones del usuario logueado (más recientes primero)
router.get('/', notificacionesController.getMisNotificaciones);

// PATCH /notificaciones/leidas -> marca todas como leídas
// (se declara antes de /:id/leida para que nunca se interprete "leidas" como id)
router.patch('/leidas', notificacionesController.marcarTodasComoLeidas);

// PATCH /notificaciones/:id/leida -> marca una como leída
router.patch(
    '/:id/leida',
    validateParams(notificacionParamsSchema),
    notificacionesController.marcarComoLeida
);

export default router;
