import { Router } from 'express';
import institucionesController from '../controllers/instituciones-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';

const router = Router();

// GET /api/instituciones/recientes
router.get('/recientes', authMiddleware, institucionesController.getRecientes);

// GET /api/instituciones (Trae todas)
router.get('/', authMiddleware, institucionesController.getAll);

export default router;