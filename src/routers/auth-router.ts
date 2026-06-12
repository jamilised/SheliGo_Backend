import { Router } from 'express';
import multer from 'multer';
import authController from '../controllers/auth-controller.js';

const router = Router();

// Configuramos multer en memoria para recibir múltiples archivos en req.files
const upload = multer({ storage: multer.memoryStorage() });

// POST /auth/register - upload.any() mapea las fotos a req.files
router.post('/register', upload.any(), authController.register);

export default router;