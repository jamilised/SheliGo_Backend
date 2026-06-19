import { Router } from 'express';
import publicacionesController from '../controllers/publicaciones-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { validateQuery } from '../middlewares/validation-middleware.js';
import { searchPublicacionSchema } from '../validations/publicacion-schema.js';

const router = Router();

// 📢 Rutas Públicas (No requieren login)
router.get('/recientes', publicacionesController.getRecientes);
router.get('/search', validateQuery(searchPublicacionSchema), publicacionesController.search);

// 🔒 Rutas Privadas (Requieren token válido)
router.get('/:id', authMiddleware, publicacionesController.getDetalle);
router.get('/:id/archivos', authMiddleware, publicacionesController.getArchivos);
router.get('/:id/preguntas', authMiddleware, publicacionesController.getPreguntas);
router.post('/:id/preguntas', authMiddleware, publicacionesController.createPregunta);

export default router;