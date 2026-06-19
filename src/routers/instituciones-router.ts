import { Router } from 'express';
import institucionesController from '../controllers/instituciones-controller.js';

const router = Router();

// GET /api/instituciones/recientes
router.get('/recientes', institucionesController.getRecientes);

// GET /api/instituciones (Trae todas)
router.get('/', institucionesController.getAll);

export default router;