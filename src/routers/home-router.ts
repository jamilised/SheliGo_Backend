import { Router } from 'express'
import homeController
from '../controllers/home-controller.js'
import { authMiddleware } from '../middlewares/auth-middleware.js'

const router = Router()

router.get(
    '/', 
    authMiddleware, 
    homeController.getHomeData
)

export default router