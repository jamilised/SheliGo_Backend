import { Router } from 'express';
import multer from 'multer';
import authController from '../controllers/auth-controller.js';
import { validateBody } from '../middlewares/validation-middleware.js';
import { loginSchema, registerSchema } from '../validations/auth-schema.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import rateLimit from "express-rate-limit";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const authLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 100,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
        status: "error",
        message:
            "Demasiados intentos. Intenta nuevamente en 15 minutos."
    }

});

// POST /api/auth/register -> Valida con Zod, atrapa los archivos con Multer y registra
router.post(
    '/register', 
    authLimiter,
    upload.any(),
    validateBody(registerSchema),
    authController.register
);

// POST /api/auth/login -> Primero valida los datos con Zod, luego va al controller
router.post(
    '/login', 
    authLimiter,
    validateBody(loginSchema),
    authController.login
);

router.post(
    '/logout', 
    authMiddleware, 
    authController.logout
);

router.post('/google', authController.loginConGoogle);

export default router;