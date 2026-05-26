import { Router } from 'express'
import publicacionesController
from '../controllers/publicaciones-controller.js'
import { authMiddleware } from '../middlewares/auth-middleware.js'

const router = Router()

router.get(
    '/home', 
    authMiddleware, 
    publicacionesController.getHomeData
)

router.get(
    '/:id',
    publicacionesController.getPublicacionDetalle
)

export default router