import { Router } from 'express'
import multer from 'multer'
import authController from '../controllers/register-controller.js'

const router = Router()

// Configuramos multer en memoria para recibir el Form Data con las fotos
const upload = multer({ storage: multer.memoryStorage() })

console.log('ROUTER: Cargando ruta POST /auth/register')

router.post(
    '/register',
    upload.any(),
    authController.register
)

export default router