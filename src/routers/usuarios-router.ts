import { Router } from 'express';
import usuariosController from '../controllers/usuarios-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { validateBody } from '../middlewares/validation-middleware.js';
import { cambiarContrasenaSchema } from '../validations/usuarios-schema.js';

const router = Router();

// GET /api/usuarios/me -> Protegido por token
router.get(
    '/me', 
    authMiddleware, 
    usuariosController.getMe
);

// PUT /api/usuarios/cambiar-contrasena
router.put(
    '/cambiar-contrasena',
    authMiddleware,
    validateBody(cambiarContrasenaSchema),
    usuariosController.cambiarContrasena // 👈 Usamos la función dentro del objeto controller
);

export default router;