import { Router } from 'express'
import PublicacionesController
    from '../controllers/publicaciones.controller.js'

const router = Router()

router.get(
    '/:id',
    PublicacionesController.getPublicacionDetalle
)

export default router