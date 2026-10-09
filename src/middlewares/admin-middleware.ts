import type { Request, Response, NextFunction } from 'express';
import AppError from '../errors/app-error.js';
import AdminRepository from '../repositories/admin-repository.js';
import type { AdminContext } from '../types/admin-types.js';

/*
Protección real del backoffice. Ocultar /admin en React es solo una
comodidad visual: cada request a /admin pasa por acá.

Se usa siempre después de authMiddleware, que valida el JWT y deja
res.locals.userIdLogged. El token no trae el rol, así que se lee de la base
en cada request: si a alguien le quitan el rol, pierde el acceso al instante.
*/

// Códigos de PostgreSQL cuando falta la columna es_admin o la tabla de auditoría
const MIGRACION_PENDIENTE = new Set(['42703', '42P01']);

export const requireAdminAccess = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const usuarioId: unknown = res.locals.userIdLogged;
        if (typeof usuarioId !== 'string' || usuarioId.length === 0) {
            throw new AppError('Token inválido o expirado', 401);
        }

        const acceso = await AdminRepository.getAcceso(usuarioId);

        // El token es válido pero el usuario ya no existe
        if (!acceso) {
            throw new AppError('Token inválido o expirado', 401);
        }

        let contexto: AdminContext;

        if (acceso.rol === 'admin') {
            contexto = { id: usuarioId, rol: 'admin', esGlobal: true, institucionesIds: [] };
        } else if (acceso.rol === 'institution_admin') {
            if (acceso.instituciones_ids.length === 0) {
                throw new AppError('No tenés instituciones asignadas para administrar.', 403);
            }
            contexto = {
                id: usuarioId,
                rol: 'institution_admin',
                esGlobal: false,
                institucionesIds: acceso.instituciones_ids
            };
        } else {
            throw new AppError('No tenés permisos para acceder al backoffice.', 403);
        }

        res.locals.admin = contexto;
        // Las respuestas del backoffice no deben quedar en cachés intermedias
        res.setHeader('Cache-Control', 'no-store');
        return next();
    } catch (error) {
        const code = (error as { code?: unknown })?.code;
        if (typeof code === 'string' && MIGRACION_PENDIENTE.has(code)) {
            console.error('[ADMIN] Falta aplicar migrations/001-backoffice-roles-y-auditoria.sql', error);
            return next(new AppError('El backoffice todavía no está habilitado en esta base de datos.', 503));
        }
        return next(error);
    }
};

// Acciones reservadas al administrador general (rol admin)
export const requireGlobalAdmin = (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    const contexto = res.locals.admin as AdminContext | undefined;
    if (!contexto?.esGlobal) {
        return next(new AppError('Esta acción requiere permisos de administrador general.', 403));
    }
    return next();
};

// Lectura tipada del contexto en controllers
export const getAdminContext = (res: Response): AdminContext => {
    const contexto = res.locals.admin as AdminContext | undefined;
    if (!contexto) {
        // Indica un error de configuración de rutas, no del cliente
        throw new Error('La ruta de administración no pasó por requireAdminAccess.');
    }
    return contexto;
};
