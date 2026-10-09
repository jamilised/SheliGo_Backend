import type { Request, Response, NextFunction } from 'express';
import { getAdminContext } from '../middlewares/admin-middleware.js';
import adminService from '../services/admin-service.js';
import adminUsuariosService from '../services/admin-usuarios-service.js';
import adminPublicacionesService from '../services/admin-publicaciones-service.js';
import adminInstitucionesService from '../services/admin-instituciones-service.js';
import adminCategoriasService from '../services/admin-categorias-service.js';
import type {
    AdminDashboardQuery,
    AdminListaQuery,
    AdminPublicacionesQuery,
    AdminUsuariosQuery
} from '../validations/admin-schema.js';

/*
Controllers del backoffice: solo traducen HTTP <-> servicios.
Los permisos ya fueron validados por admin-middleware y los datos por Zod.
*/

// req.params.id ya pasó por validateParams(adminIdParamsSchema)
const idParam = (req: Request) => String(req.params.id);

const ok = (res: Response, data: unknown, status = 200) =>
    res.status(status).json({ status: 'success', data });

// ---------- Sesión y dashboard ----------

const getSesion = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        return ok(res, await adminService.getSesion(getAdminContext(res)));
    } catch (error) {
        return next(error);
    }
};

const getDashboard = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const { institucion_id } = res.locals.validatedQuery as AdminDashboardQuery;
        return ok(res, await adminService.getDashboard(getAdminContext(res), institucion_id));
    } catch (error) {
        return next(error);
    }
};

// ---------- Usuarios ----------

const listarUsuarios = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const filtros = res.locals.validatedQuery as AdminUsuariosQuery;
        return ok(res, await adminUsuariosService.listar(getAdminContext(res), filtros));
    } catch (error) {
        return next(error);
    }
};

const getUsuario = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const usuario = await adminUsuariosService.getDetalle(getAdminContext(res), idParam(req));
        return ok(res, { usuario });
    } catch (error) {
        return next(error);
    }
};

const cambiarRolUsuario = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const usuario = await adminUsuariosService.cambiarRol(
            getAdminContext(res),
            idParam(req),
            req.body.rol,
            req.body.instituciones_ids
        );
        return ok(res, { usuario });
    } catch (error) {
        return next(error);
    }
};

const cambiarInstitucionesUsuario = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const usuario = await adminUsuariosService.cambiarInstituciones(
            getAdminContext(res),
            idParam(req),
            req.body.instituciones_ids
        );
        return ok(res, { usuario });
    } catch (error) {
        return next(error);
    }
};

// ---------- Publicaciones ----------

const listarPublicaciones = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const filtros = res.locals.validatedQuery as AdminPublicacionesQuery;
        return ok(res, await adminPublicacionesService.listar(getAdminContext(res), filtros));
    } catch (error) {
        return next(error);
    }
};

const getPublicacion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const publicacion = await adminPublicacionesService.getDetalle(getAdminContext(res), idParam(req));
        return ok(res, { publicacion });
    } catch (error) {
        return next(error);
    }
};

const cambiarEstadoPublicacion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const publicacion = await adminPublicacionesService.cambiarEstado(
            getAdminContext(res),
            idParam(req),
            req.body.estado,
            req.body.motivo
        );
        return ok(res, { publicacion });
    } catch (error) {
        return next(error);
    }
};

// ---------- Instituciones ----------

const listarInstituciones = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const filtros = res.locals.validatedQuery as AdminListaQuery;
        return ok(res, await adminInstitucionesService.listar(getAdminContext(res), filtros));
    } catch (error) {
        return next(error);
    }
};

const getInstitucion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const institucion = await adminInstitucionesService.getDetalle(getAdminContext(res), idParam(req));
        return ok(res, { institucion });
    } catch (error) {
        return next(error);
    }
};

const crearInstitucion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const institucion = await adminInstitucionesService.crear(getAdminContext(res), req.body, req.file);
        return ok(res, { institucion }, 201);
    } catch (error) {
        return next(error);
    }
};

const editarInstitucion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const institucion = await adminInstitucionesService.editar(
            getAdminContext(res),
            idParam(req),
            req.body,
            req.file
        );
        return ok(res, { institucion });
    } catch (error) {
        return next(error);
    }
};

const eliminarInstitucion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await adminInstitucionesService.eliminar(getAdminContext(res), idParam(req));
        return res.status(200).json({ status: 'success', message: 'Institución eliminada' });
    } catch (error) {
        return next(error);
    }
};

// ---------- Categorías ----------

const listarCategorias = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const filtros = res.locals.validatedQuery as AdminListaQuery;
        return ok(res, await adminCategoriasService.listar(getAdminContext(res), filtros));
    } catch (error) {
        return next(error);
    }
};

const crearCategoria = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categoria = await adminCategoriasService.crear(getAdminContext(res), req.body);
        return ok(res, { categoria }, 201);
    } catch (error) {
        return next(error);
    }
};

const editarCategoria = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categoria = await adminCategoriasService.editar(getAdminContext(res), idParam(req), req.body);
        return ok(res, { categoria });
    } catch (error) {
        return next(error);
    }
};

const eliminarCategoria = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await adminCategoriasService.eliminar(getAdminContext(res), idParam(req));
        return res.status(200).json({ status: 'success', message: 'Categoría eliminada' });
    } catch (error) {
        return next(error);
    }
};

export default {
    getSesion,
    getDashboard,
    listarUsuarios,
    getUsuario,
    cambiarRolUsuario,
    cambiarInstitucionesUsuario,
    listarPublicaciones,
    getPublicacion,
    cambiarEstadoPublicacion,
    listarInstituciones,
    getInstitucion,
    crearInstitucion,
    editarInstitucion,
    eliminarInstitucion,
    listarCategorias,
    crearCategoria,
    editarCategoria,
    eliminarCategoria
};
