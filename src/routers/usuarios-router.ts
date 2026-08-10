import { Router } from 'express';
import usuariosController from '../controllers/usuarios-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';

import upload from "../middlewares/upload-middleware.js";
import { validateBody } from "../middlewares/validation-middleware.js";
import { updatePerfilSchema } from "../validations/usuarios-schema.js";


const router = Router();

// GET /api/usuarios/me -> Protegido por token, devuelve el perfil limpio
router.get(
    '/me', 
    authMiddleware, 
    usuariosController.getMe
);

/*router.put(
    '/cambiar-contrasena',
    authMiddleware,
    validateBody(cambiarContrasenaSchema),
    usuariosController.cambiarContrasena // 👈 Usamos la función dentro del objeto controller
);*/


router.put(
    "/me",
    authMiddleware,
    upload.any(),
    validateBody(updatePerfilSchema),
    usuariosController.editarPerfil
);

export default router;