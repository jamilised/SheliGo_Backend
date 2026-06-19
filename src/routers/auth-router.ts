import { Router } from 'express';
import multer from 'multer';
import authController from '../controllers/auth-controller.js';
import { validateBody } from '../middlewares/validation-middleware.js';
import { loginSchema, registerSchema } from '../validations/auth-schema.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/auth/login -> Primero valida los datos con Zod, luego va al controller
router.post(
    '/register', 
    upload.any(),
    validateBody(registerSchema),
    authController.register
);

// POST /api/auth/register -> Valida con Zod, atrapa los archivos con Multer y registra
router.post(
    '/register', 
    validateBody(registerSchema), 
    upload.any(), 
    authController.register
);

export default router;