import { Router } from 'express';
import publicacionesController from '../controllers/publicaciones-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { validateQuery, validateBody } from '../middlewares/validation-middleware.js';
import {
    searchPublicacionSchema,
    createPublicacionSchema,
    updatePublicacionSchema,
    getPublicacionSchema
} from '../validations/publicacion-schema.js';
import {
    createPreguntaSchema,
    createRespuestaSchema,
    preguntaParamsSchema,
    publicacionPreguntaParamsSchema
} from '../validations/preguntas-schema.js';
import upload from "../middlewares/upload-middleware.js";
import { validateParams } from '../middlewares/validation-middleware.js';

const router = Router();

router.get('/recientes', authMiddleware, publicacionesController.getRecientes);
router.get("/mias", authMiddleware, publicacionesController.getMisPublicaciones);
router.get(
    '/search',
    authMiddleware,
    validateQuery(searchPublicacionSchema),
    publicacionesController.search
);
router.get('/:id', authMiddleware, validateParams(getPublicacionSchema), publicacionesController.getDetalle);
router.get('/:id/archivos', authMiddleware, validateParams(getPublicacionSchema), publicacionesController.getArchivos);
router.get(
    '/:id/preguntas',
    authMiddleware,
    validateParams(publicacionPreguntaParamsSchema),
    publicacionesController.getPreguntas
);
router.post(
    '/:id/preguntas',
    authMiddleware,
    validateParams(publicacionPreguntaParamsSchema),
    validateBody(createPreguntaSchema),
    publicacionesController.createPregunta
);
router.post(
    '/preguntas/:preguntaId/respuesta',
    authMiddleware,
    validateParams(preguntaParamsSchema),
    validateBody(createRespuestaSchema),
    publicacionesController.createRespuesta
);

router.patch("/:id/recuperar", authMiddleware, validateParams(getPublicacionSchema), publicacionesController.marcarRecuperada);

router.delete("/:id", authMiddleware, validateParams(getPublicacionSchema), publicacionesController.remove);
router.put("/:id", authMiddleware, validateParams(getPublicacionSchema), upload.array("imagenes", 5), validateBody(updatePublicacionSchema), publicacionesController.update);

router.post("/", authMiddleware, upload.array("imagenes", 5), validateBody(createPublicacionSchema), publicacionesController.create);

export default router;