import { Router } from 'express'
import homeController from '../controllers/home-controller.js'
//import { authMiddleware } from '../middlewares/auth-middleware.js'
import { authMiddleware } from '../middlewares/auth-middleware.js'

const router = Router()

// GET /home/usuario
router.get(
    '/usuario' //, authMiddleware
, authMiddleware,
homeController.getHomeUsuario)

// GET /home/publicaciones
router.get('/publicaciones'//, authMiddleware
,authMiddleware,
 homeController.getHomePublicaciones)

// GET /home/instituciones
router.get('/instituciones'//, authMiddleware
,authMiddleware,
 homeController.getHomeInstituciones)

export default router