import { Router } from 'express';
import chatController from '../controllers/chat-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';

const router = Router();

// Todas las rutas de chat necesitan autenticación previa 🔒
router.use(authMiddleware);

// 1. GET /api/chat/salas -> Obtener mis salas activas
router.get('/salas', chatController.getMisSalas);

// 2. POST /api/chat/salas -> Abrir o crear una sala con otro usuario
router.post('/salas', chatController.abrirOCrearChat);

// 3. GET /api/chat/salas/:id/mensajes -> Obtener los mensajes de una sala
router.get('/salas/:id/mensajes', chatController.getMensajesSala);

// 4. POST /api/chat/mensaje -> Enviar un mensaje nuevo
router.post('/mensaje', chatController.enviarMensaje);

// 5. DELETE /api/chat/mensaje/:id -> Eliminar un mensaje específico
router.delete('/mensaje/:id', chatController.eliminarMensaje);

// 6. GET 
router.get('/search', chatController.searchActiveChats);

export default router;