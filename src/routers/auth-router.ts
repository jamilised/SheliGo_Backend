import { Router } from 'express';
import authController from '../controllers/auth-controller.js';
import { validateBody } from '../middlewares/validation-middleware.js';
import {
    completeInstitutionsSchema,
    loginSchema,
    registerSchema
} from '../validations/auth-schema.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import rateLimit from "express-rate-limit";
import upload from "../middlewares/upload-middleware.js";

const router = Router();

const authLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    // Solo cuentan los intentos fallidos: un login correcto no consume el cupo
    max: 10,

    skipSuccessfulRequests: true,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
        status: "error",
        message:
            "Demasiados intentos. Intenta nuevamente en 15 minutos."
    }

});

// POST /auth/register -> Valida con Zod, atrapa los archivos con Multer y registra
router.post(
    '/register', 
    authLimiter,
    upload.single('foto'),
    validateBody(registerSchema),
    authController.register
);

// POST /auth/login -> Primero valida los datos con Zod, luego va al controller
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

// Se autentica con el token de Supabase (Google), no con el JWT de la app:
// el usuario recién obtiene la sesión de SheliGo al completar este paso.
router.post(
    '/completar-instituciones', 
    authLimiter,
    validateBody(completeInstitutionsSchema),
    authController.asociarInstituciones
);

export default router;