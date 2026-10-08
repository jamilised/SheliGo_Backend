import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import adminController from '../controllers/admin-controller.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { requireAdminAccess, requireGlobalAdmin } from '../middlewares/admin-middleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation-middleware.js';
import upload from '../middlewares/upload-middleware.js';
import {
    adminCambiarEstadoSchema,
    adminCambiarRolSchema,
    adminCrearCategoriaSchema,
    adminCrearInstitucionSchema,
    adminDashboardQuerySchema,
    adminEditarCategoriaSchema,
    adminEditarInstitucionSchema,
    adminIdParamsSchema,
    adminInstitucionesUsuarioSchema,
    adminListaQuerySchema,
    adminPublicacionesQuerySchema,
    adminUsuariosQuerySchema
} from '../validations/admin-schema.js';

/*
Backoffice: /admin/*

Toda ruta pasa por:
1. authMiddleware      -> JWT válido (401)
2. requireAdminAccess  -> rol admin o institution_admin leído de la base (403)
3. requireGlobalAdmin  -> solo en acciones del admin general (403)

El alcance por institución del institution_admin se aplica en servicios y
repositorios, no en el frontend.
*/
const router = Router();

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Demasiadas solicitudes al backoffice. Intentá nuevamente en unos minutos.'
    }
});

router.use(adminLimiter, authMiddleware, requireAdminAccess);

const conId = validateParams(adminIdParamsSchema);

// Sesión y dashboard
router.get('/me', adminController.getSesion);
router.get('/dashboard', validateQuery(adminDashboardQuerySchema), adminController.getDashboard);

// Usuarios (lectura con alcance; cambios solo admin general)
router.get('/usuarios', validateQuery(adminUsuariosQuerySchema), adminController.listarUsuarios);
router.get('/usuarios/:id', conId, adminController.getUsuario);
router.patch(
    '/usuarios/:id/rol',
    requireGlobalAdmin,
    conId,
    validateBody(adminCambiarRolSchema),
    adminController.cambiarRolUsuario
);
router.put(
    '/usuarios/:id/instituciones',
    requireGlobalAdmin,
    conId,
    validateBody(adminInstitucionesUsuarioSchema),
    adminController.cambiarInstitucionesUsuario
);

// Publicaciones (moderación con alcance)
router.get('/publicaciones', validateQuery(adminPublicacionesQuerySchema), adminController.listarPublicaciones);
router.get('/publicaciones/:id', conId, adminController.getPublicacion);
router.patch(
    '/publicaciones/:id/estado',
    conId,
    validateBody(adminCambiarEstadoSchema),
    adminController.cambiarEstadoPublicacion
);

// Instituciones (alta y baja solo admin general; edición con alcance)
router.get('/instituciones', validateQuery(adminListaQuerySchema), adminController.listarInstituciones);
router.get('/instituciones/:id', conId, adminController.getInstitucion);
router.post(
    '/instituciones',
    requireGlobalAdmin,
    upload.single('foto'),
    validateBody(adminCrearInstitucionSchema),
    adminController.crearInstitucion
);
router.patch(
    '/instituciones/:id',
    conId,
    upload.single('foto'),
    validateBody(adminEditarInstitucionSchema),
    adminController.editarInstitucion
);
router.delete('/instituciones/:id', requireGlobalAdmin, conId, adminController.eliminarInstitucion);

// Categorías (lectura para todo administrador; cambios solo admin general)
router.get('/categorias', validateQuery(adminListaQuerySchema), adminController.listarCategorias);
router.post('/categorias', requireGlobalAdmin, validateBody(adminCrearCategoriaSchema), adminController.crearCategoria);
router.patch(
    '/categorias/:id',
    requireGlobalAdmin,
    conId,
    validateBody(adminEditarCategoriaSchema),
    adminController.editarCategoria
);
router.delete('/categorias/:id', requireGlobalAdmin, conId, adminController.eliminarCategoria);

export default router;
