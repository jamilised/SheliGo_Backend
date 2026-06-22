import { Router } from 'express';
import categoriasController from '../controllers/categorias-controller.js';

const router = Router();

// GET /api/categorias
router.get('/', categoriasController.getAll);

export default router;