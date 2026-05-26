import { Router } from 'express'
import publicacionesController
from '../controllers/publicaciones-controller.js';

import ArchivosController
from '../controllers/archivos-controller.js'

import PreguntasController
from '../controllers/preguntas-controller.js'

const router = Router()

router.get(
    '/:id',
    publicacionesController.getPublicacionDetalle
)

router.get(
    '/:id/archivos',
    ArchivosController
        .getPublicacionArchivos
)

router.get(
    '/:id/preguntas',
    PreguntasController
        .getPreguntas
)

router.post(
    '/:id/preguntas',
    PreguntasController
        .createPregunta
)

export default router