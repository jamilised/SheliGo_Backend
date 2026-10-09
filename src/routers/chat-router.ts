import { Router } from 'express';
import chatController from '../controllers/chat-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import upload from "../middlewares/upload-middleware.js";
import { validateBody, validateParams, validateQuery } from '../middlewares/validation-middleware.js';
import {
    abrirChatSchema,
    chatMensajeParamsSchema,
    chatSalasQuerySchema,
    chatSalaParamsSchema,
    enviarMensajeSchema
} from '../validations/chat-schema.js';

const router = Router();

// Todas las rutas de chat necesitan autenticación previa 🔒
router.use(authMiddleware);

// 1. GET /api/chat/salas -> // Soporta: /salas, /salas?filtro=no_leidas, /salas?busqueda=Juan, o combinados!
router.get('/salas', validateQuery(chatSalasQuerySchema), chatController.getMisSalas);

// 2. POST /api/chat/salas -> Abrir o crear una sala con otro usuario
router.post('/salas', validateBody(abrirChatSchema), chatController.abrirOCrearChat);

// 3. GET /api/chat/salas/:id/mensajes -> Obtener los mensajes de una sala
router.get(
    '/salas/:id/mensajes',
    validateParams(chatSalaParamsSchema),
    chatController.getMensajesSala
);

// 📸 4. POST /api/chat/mensaje -> Permite enviar texto (JSON) O fotos enviadas por multipart/form-data (campo 'foto')
router.post(
    '/mensaje',
    upload.single('foto'),
    validateBody(enviarMensajeSchema),
    chatController.enviarMensaje
);

// 5. DELETE /api/chat/mensaje/:id -> Eliminar un mensaje específico
router.delete(
    '/mensaje/:id',
    validateParams(chatMensajeParamsSchema),
    chatController.eliminarMensaje
);

export default router;