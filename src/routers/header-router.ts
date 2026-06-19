import { Router } from 'express'
import headerController from '../controllers/header-controller.js'
import { authMiddleware } from '../middlewares/auth-middleware.js'

const router = Router()

router.get(
    '/', 
    authMiddleware, 
    headerController.getDatosHeader
)

export default router