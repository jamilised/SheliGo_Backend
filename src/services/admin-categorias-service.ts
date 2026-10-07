import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import dbPg from '../database/db-pg.js';
import AdminCategoriasRepository from '../repositories/admin-categorias-repository.js';
import AuditoriaRepository from '../repositories/auditoria-repository.js';
import { PaginationHelper } from '../helpers/pagination-helper.js';
import AppError from '../errors/app-error.js';
import type { AdminContext } from '../types/admin-types.js';
import type {
    AdminCrearCategoria,
    AdminEditarCategoria,
    AdminListaQuery
} from '../validations/admin-schema.js';

const validarNombreLibre = async (client: PoolClient, nombre: string, excluirId: string | null) => {
    if (await AdminCategoriasRepository.existeNombre(client, nombre, excluirId)) {
        throw new AppError('Ya existe una categoría con ese nombre.', 409);
    }
};

// La creación, edición y baja de categorías es solo del admin general (requireGlobalAdmin)
class AdminCategoriasService {
    listar = async (ctx: AdminContext, filtros: AdminListaQuery) => {
        const { items, total } = await AdminCategoriasRepository.listar(ctx, filtros);
        return PaginationHelper.build(items, total, filtros.page, filtros.limit);
    };

    crear = async (ctx: AdminContext, body: AdminCrearCategoria) => {
        const id = randomUUID();

        return dbPg.transaction(async (client) => {
            await validarNombreLibre(client, body.nombre, null);
            const categoria = await AdminCategoriasRepository.crear(client, id, body.nombre, body.descripcion ?? null);
            await AuditoriaRepository.registrar(client, {
                adminId: ctx.id,
                accion: 'categoria.crear',
                entidad: 'categoria',
                entidadId: id,
                institucionId: null,
                detalle: { nombre: body.nombre }
            });
            return categoria;
        });
    };

    editar = async (ctx: AdminContext, id: string, body: AdminEditarCategoria) => {
        return dbPg.transaction(async (client) => {
            const actual = await AdminCategoriasRepository.bloquear(client, id);
            if (!actual) {
                throw new AppError('Categoría no encontrada', 404);
            }

            const nombre = body.nombre ?? actual.nombre;
            const descripcion = body.descripcion !== undefined ? body.descripcion : actual.descripcion;
            if (nombre === actual.nombre && descripcion === actual.descripcion) {
                return actual;
            }

            if (nombre.toLowerCase() !== actual.nombre.toLowerCase()) {
                await validarNombreLibre(client, nombre, id);
            }

            const categoria = await AdminCategoriasRepository.actualizar(client, id, nombre, descripcion);
            await AuditoriaRepository.registrar(client, {
                adminId: ctx.id,
                accion: 'categoria.editar',
                entidad: 'categoria',
                entidadId: id,
                institucionId: null,
                detalle: {
                    nombre_anterior: actual.nombre,
                    nombre_nuevo: nombre,
                    descripcion_cambiada: descripcion !== actual.descripcion
                }
            });
            return categoria;
        });
    };

    // publicaciones.categoria_id es RESTRICT: no se borra si alguna publicación la usa (incluidas eliminadas)
    eliminar = async (ctx: AdminContext, id: string) => {
        try {
            await dbPg.transaction(async (client) => {
                const actual = await AdminCategoriasRepository.bloquear(client, id);
                if (!actual) {
                    throw new AppError('Categoría no encontrada', 404);
                }

                const publicaciones = await AdminCategoriasRepository.contarPublicaciones(client, id);
                if (publicaciones > 0) {
                    throw new AppError(
                        `No se puede eliminar: ${publicaciones} publicación(es) usan esta categoría.`,
                        409
                    );
                }

                await AdminCategoriasRepository.eliminar(client, id);
                await AuditoriaRepository.registrar(client, {
                    adminId: ctx.id,
                    accion: 'categoria.eliminar',
                    entidad: 'categoria',
                    entidadId: id,
                    institucionId: null,
                    detalle: { nombre: actual.nombre, descripcion: actual.descripcion }
                });
            });
        } catch (error) {
            if ((error as { code?: unknown })?.code === '23503') {
                throw new AppError('No se puede eliminar: la categoría tiene registros asociados.', 409);
            }
            throw error;
        }
    };
}

export default new AdminCategoriasService();
