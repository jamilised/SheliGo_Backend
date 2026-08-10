import { Router } from 'express';
import chatController from '../controllers/chat-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import multer from 'multer';
import AppError from '../errors/app-error.js';

// Configuración de Multer para aceptar únicamente imágenes en memoria
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 8 * 1024 * 1024 // Límite máximo de 8MB por foto
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new AppError('Solo se permiten archivos de imagen (JPEG, PNG, WEBP, etc.).', 400) as any, false);
        }
    }
});

const router = Router();

// Todas las rutas de chat necesitan autenticación previa 🔒
router.use(authMiddleware);

// 1. GET /api/chat/salas -> // Soporta: /salas, /salas?filtro=no_leidas, /salas?busqueda=Juan, o combinados!
router.get('/salas', chatController.getMisSalas);

// 2. POST /api/chat/salas -> Abrir o crear una sala con otro usuario
router.post('/salas', chatController.abrirOCrearChat);

// 3. GET /api/chat/salas/:id/mensajes -> Obtener los mensajes de una sala
router.get('/salas/:id/mensajes', chatController.getMensajesSala);

// 📸 4. POST /api/chat/mensaje -> Permite enviar texto (JSON) O fotos enviadas por multipart/form-data (campo 'foto')
router.post('/mensaje', upload.single('foto'), chatController.enviarMensaje);

// 5. DELETE /api/chat/mensaje/:id -> Eliminar un mensaje específico
router.delete('/mensaje/:id', chatController.eliminarMensaje);

export default router;