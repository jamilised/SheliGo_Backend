import { Router } from 'express';
import usuariosController from '../controllers/usuarios-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';

const router = Router();

// GET /api/usuarios/me -> Protegido por token, devuelve el perfil limpio
router.get(
    '/me', 
    authMiddleware, 
    usuariosController.getMe
);

export default router;