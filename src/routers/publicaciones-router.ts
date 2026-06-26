import { Router } from 'express';
import publicacionesController from '../controllers/publicaciones-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { validateQuery } from '../middlewares/validation-middleware.js';
import { searchPublicacionSchema } from '../validations/publicacion-schema.js';
import upload from "../middlewares/upload-middleware.js";

const router = Router();

router.get('/recientes', authMiddleware, publicacionesController.getRecientes);
router.get('/search', authMiddleware, publicacionesController.search);
router.get('/:id', authMiddleware, publicacionesController.getDetalle);
router.get('/:id/archivos', authMiddleware, publicacionesController.getArchivos);
router.get('/:id/preguntas', authMiddleware, publicacionesController.getPreguntas);
router.post('/:id/preguntas', authMiddleware, publicacionesController.createPregunta);

router.post("/", authMiddleware, upload.array("imagenes",10), publicacionesController.create);

export default router;

