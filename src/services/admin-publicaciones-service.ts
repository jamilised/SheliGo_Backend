import dbPg from '../database/db-pg.js';
import AdminPublicacionesRepository from '../repositories/admin-publicaciones-repository.js';
import AuditoriaRepository from '../repositories/auditoria-repository.js';
import { PaginationHelper } from '../helpers/pagination-helper.js';
import { AdminAlcanceHelper } from '../helpers/admin-alcance-helper.js';
import { StorageHelper } from '../helpers/storage-helper.js';
import AppError from '../errors/app-error.js';
import type { AdminContext, EstadoPublicacion } from '../types/admin-types.js';
import type { AdminPublicacionesQuery } from '../validations/admin-schema.js';

class AdminPublicacionesService {
    listar = async (ctx: AdminContext, filtros: AdminPublicacionesQuery) => {
        AdminAlcanceHelper.validarInstitucion(ctx, filtros.institucion_id);

        const { items, total } = await AdminPublicacionesRepository.listar(ctx, filtros);
        const conFoto = items.map((p: any) => ({
            ...p,
            foto_principal_url: StorageHelper.buildOptionalUrl(p.foto_principal_url)
        }));
        return PaginationHelper.build(conFoto, total, filtros.page, filtros.limit);
    };

    getDetalle = async (ctx: AdminContext, id: string) => {
        const publicacion = await AdminPublicacionesRepository.getDetalle(ctx, id);
        if (!publicacion) {
            throw new AppError('Publicación no encontrada', 404);
        }

        return {
            ...publicacion,
            archivos: publicacion.archivos.map((archivo: any) => ({
                ...archivo,
                url: StorageHelper.buildUrl(archivo.url)
            }))
        };
    };

    /*
    Moderación: cambiar estado, eliminar (baja lógica, estado 'eliminada') o
    restaurar. Nunca se borra la fila: las preguntas, archivos y notificaciones
    asociadas se conservan.
    */
    cambiarEstado = async (
        ctx: AdminContext,
        id: string,
        estado: EstadoPublicacion,
        motivo: string | undefined
    ) => {
        await dbPg.transaction(async (client) => {
            const publicacion = await AdminPublicacionesRepository.bloquear(client, id);
            const fueraDeAlcance = publicacion && !ctx.esGlobal &&
                (!publicacion.institucion_id || !ctx.institucionesIds.includes(publicacion.institucion_id));

            if (!publicacion || fueraDeAlcance) {
                throw new AppError('Publicación no encontrada', 404);
            }

            // Mismo estado: operación idempotente, sin auditoría
            if (publicacion.estado === estado) {
                return;
            }

            await AdminPublicacionesRepository.actualizarEstado(client, id, estado);

            const accion = estado === 'eliminada'
                ? 'publicacion.eliminar'
                : publicacion.estado === 'eliminada'
                    ? 'publicacion.restaurar'
                    : 'publicacion.cambiar_estado';

            await AuditoriaRepository.registrar(client, {
                adminId: ctx.id,
                accion,
                entidad: 'publicacion',
                entidadId: id,
                institucionId: publicacion.institucion_id,
                detalle: {
                    nombre: publicacion.nombre,
                    estado_anterior: publicacion.estado,
                    estado_nuevo: estado,
                    motivo: motivo || null
                }
            });
        });

        return this.getDetalle(ctx, id);
    };
}

export default new AdminPublicacionesService();
