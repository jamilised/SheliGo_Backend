import { Router } from 'express'
import publicacionesController
from '../controllers/publicaciones-controller.js'

const router = Router()

router.get(
    '/:id',
    publicacionesController.getPublicacionDetalle
)

export default router