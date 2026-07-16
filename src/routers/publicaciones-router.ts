import { Router } from 'express';
import publicacionesController from '../controllers/publicaciones-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { validateQuery, validateBody } from '../middlewares/validation-middleware.js';
import { searchPublicacionSchema, createPublicacionSchema } from '../validations/publicacion-schema.js';
import upload from "../middlewares/upload-middleware.js";

const router = Router();

router.get('/recientes', authMiddleware, publicacionesController.getRecientes);
router.get("/mias", authMiddleware, publicacionesController.getMisPublicaciones);
router.get('/search', authMiddleware, publicacionesController.search);
router.get('/:id', authMiddleware, publicacionesController.getDetalle);
router.get('/:id/archivos', authMiddleware, publicacionesController.getArchivos);
router.get('/:id/preguntas', authMiddleware, publicacionesController.getPreguntas);
router.post('/:id/preguntas', authMiddleware, publicacionesController.createPregunta);
router.post("/preguntas/:preguntaId/respuesta", authMiddleware, publicacionesController.createRespuesta);

router.delete("/:id", authMiddleware, publicacionesController.remove);
router.put("/:id", authMiddleware, upload.array("imagenes", 5), publicacionesController.update);

router.post("/", authMiddleware, upload.array("imagenes",5), validateBody(createPublicacionSchema), publicacionesController.create);

export default router;

