import { Router } from 'express'
import publicacionesController
from '../controllers/publicaciones.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'

const router = Router()

router.get(
    '/:id',
    publicacionesController.getPublicacionDetalle
)

router.get(
    '/home', 
    authMiddleware, 
    publicacionesController.getHomeData
)

export default router