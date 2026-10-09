import dbPg from '../database/db-pg.js';
import AdminUsuariosRepository from '../repositories/admin-usuarios-repository.js';
import AdminInstitucionesRepository from '../repositories/admin-instituciones-repository.js';
import AuditoriaRepository from '../repositories/auditoria-repository.js';
import { PaginationHelper } from '../helpers/pagination-helper.js';
import { AdminAlcanceHelper } from '../helpers/admin-alcance-helper.js';
import { StorageHelper } from '../helpers/storage-helper.js';
import AppError from '../errors/app-error.js';
import type { AdminContext, Rol } from '../types/admin-types.js';
import type { AdminUsuariosQuery } from '../validations/admin-schema.js';

const conFoto = <T extends { foto?: string | null }>(usuario: T): T => ({
    ...usuario,
    foto: StorageHelper.buildUrl(usuario.foto)
});

const mismosIds = (a: string[], b: string[]) =>
    a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');

class AdminUsuariosService {
    listar = async (ctx: AdminContext, filtros: AdminUsuariosQuery) => {
        AdminAlcanceHelper.validarInstitucion(ctx, filtros.institucion_id);

        const { items, total } = await AdminUsuariosRepository.listar(ctx, filtros);
        return PaginationHelper.build(items.map(conFoto), total, filtros.page, filtros.limit);
    };

    // 404 también cuando el usuario existe pero está fuera del alcance: no se revela su existencia
    getDetalle = async (ctx: AdminContext, id: string) => {
        const usuario = await AdminUsuariosRepository.getDetalle(ctx, id);
        if (!usuario) {
            throw new AppError('Usuario no encontrado', 404);
        }
        return conFoto(usuario);
    };

    /*
    Solo el admin general (lo garantiza requireGlobalAdmin en la ruta).
    Para institution_admin, las instituciones indicadas quedan con es_admin = true
    (creando la membresía si no existía) y el resto vuelve a es_admin = false.
    */
    cambiarRol = async (
        ctx: AdminContext,
        usuarioId: string,
        rol: Rol,
        institucionesIds: string[] | undefined
    ) => {
        if (usuarioId === ctx.id) {
            throw new AppError('No podés cambiar tu propio rol.', 403);
        }

        const institucionesAdmin = rol === 'institution_admin' ? institucionesIds ?? [] : [];

        await dbPg.transaction(async (client) => {
            const usuario = await AdminUsuariosRepository.bloquear(client, usuarioId);
            if (!usuario) {
                throw new AppError('Usuario no encontrado', 404);
            }

            if (institucionesAdmin.length > 0) {
                const existentes = await AdminInstitucionesRepository.contarExistentes(client, institucionesAdmin);
                if (existentes !== institucionesAdmin.length) {
                    throw new AppError('Alguna de las instituciones seleccionadas no existe.', 400);
                }
            }

            const membresias = await AdminUsuariosRepository.getMembresias(client, usuarioId);
            const adminAntes = membresias.filter((m) => m.es_admin).map((m) => m.institucion_id);

            // Sin cambios reales: no se toca la base ni se audita
            if (usuario.rol === rol && mismosIds(adminAntes, institucionesAdmin)) {
                return;
            }

            await AdminUsuariosRepository.actualizarRol(client, usuarioId, rol);
            await AdminUsuariosRepository.quitarAdministracion(client, usuarioId);
            if (institucionesAdmin.length > 0) {
                await AdminUsuariosRepository.asignarAdministracion(client, usuarioId, institucionesAdmin);
            }

            await AuditoriaRepository.registrar(client, {
                adminId: ctx.id,
                accion: 'usuario.cambiar_rol',
                entidad: 'usuario',
                entidadId: usuarioId,
                institucionId: institucionesAdmin.length === 1 ? institucionesAdmin[0] ?? null : null,
                detalle: {
                    email: usuario.email,
                    rol_anterior: usuario.rol,
                    rol_nuevo: rol,
                    instituciones_admin_anteriores: adminAntes,
                    instituciones_admin_nuevas: institucionesAdmin
                }
            });
        });

        return this.getDetalle(ctx, usuarioId);
    };

    // Reemplaza las instituciones a las que pertenece el usuario (solo admin general)
    cambiarInstituciones = async (ctx: AdminContext, usuarioId: string, institucionesIds: string[]) => {
        await dbPg.transaction(async (client) => {
            const usuario = await AdminUsuariosRepository.bloquear(client, usuarioId);
            if (!usuario) {
                throw new AppError('Usuario no encontrado', 404);
            }

            const existentes = await AdminInstitucionesRepository.contarExistentes(client, institucionesIds);
            if (existentes !== institucionesIds.length) {
                throw new AppError('Alguna de las instituciones seleccionadas no existe.', 400);
            }

            const membresias = await AdminUsuariosRepository.getMembresias(client, usuarioId);
            const antes = membresias.map((m) => m.institucion_id);
            if (mismosIds(antes, institucionesIds)) {
                return;
            }

            // Un administrador institucional no puede quedarse sin instituciones a cargo
            if (usuario.rol === 'institution_admin') {
                const sigueAdministrando = membresias.some(
                    (m) => m.es_admin && institucionesIds.includes(m.institucion_id)
                );
                if (!sigueAdministrando) {
                    throw new AppError(
                        'Es administrador institucional y se quedaría sin instituciones a cargo. Cambiá primero su rol.',
                        400
                    );
                }
            }

            await AdminUsuariosRepository.reemplazarMembresias(client, usuarioId, institucionesIds);

            await AuditoriaRepository.registrar(client, {
                adminId: ctx.id,
                accion: 'usuario.cambiar_instituciones',
                entidad: 'usuario',
                entidadId: usuarioId,
                institucionId: null,
                detalle: {
                    email: usuario.email,
                    instituciones_anteriores: antes,
                    instituciones_nuevas: institucionesIds
                }
            });
        });

        return this.getDetalle(ctx, usuarioId);
    };
}

export default new AdminUsuariosService();
