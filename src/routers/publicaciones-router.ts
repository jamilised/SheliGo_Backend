import { Router } from 'express'
import publicacionesController
from '../controllers/publicaciones-controller.js';

import ArchivosController
from '../controllers/archivos-controller.js'

import PreguntasController
from '../controllers/preguntas-controller.js'

import { authMiddleware } from '../middlewares/authMiddleware.js'

const router = Router()

router.get('/search', 
    publicacionesController.search
);

router.get(
    '/:id',
    authMiddleware,
    publicacionesController.getPublicacionDetalle
)

router.get(
    '/:id/archivos',
    authMiddleware,
    ArchivosController
        .getPublicacionArchivos
)

router.get(
    '/:id/preguntas',
    authMiddleware,
    PreguntasController
        .getPreguntas
)

router.post(
    '/:id/preguntas',
    authMiddleware,
    PreguntasController
        .createPregunta
)

export default router