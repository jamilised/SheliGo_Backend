import AdminRepository from '../repositories/admin-repository.js';
import AuditoriaRepository from '../repositories/auditoria-repository.js';
import { StorageHelper } from '../helpers/storage-helper.js';
import AppError from '../errors/app-error.js';
import { AdminAlcanceHelper } from '../helpers/admin-alcance-helper.js';
import type { AdminContext } from '../types/admin-types.js';

class AdminService {
    /*
    Sesión del backoffice. "permisos" solo le dice a la interfaz qué mostrar;
    cada endpoint vuelve a validar el permiso en el backend.
    */
    getSesion = async (ctx: AdminContext) => {
        const { usuario, instituciones } = await AdminRepository.getPerfil(ctx);
        if (!usuario) {
            throw new AppError('Token inválido o expirado', 401);
        }

        return {
            usuario: { ...usuario, foto: StorageHelper.buildUrl(usuario.foto) },
            es_global: ctx.esGlobal,
            instituciones,
            permisos: {
                usuarios: {
                    ver: true,
                    cambiar_rol: ctx.esGlobal,
                    gestionar_instituciones: ctx.esGlobal
                },
                publicaciones: { ver: true, moderar: true },
                instituciones: {
                    ver: true,
                    crear: ctx.esGlobal,
                    editar: true,
                    eliminar: ctx.esGlobal
                },
                categorias: { ver: true, gestionar: ctx.esGlobal }
            }
        };
    };

    /*
    Totales, publicaciones y actividad se consultan ya filtrados en SQL por el
    alcance del administrador. institucion_id solo puede acotarlo (403 si está
    fuera de las instituciones que administra).
    */
    getDashboard = async (ctx: AdminContext, institucionId?: string) => {
        const alcance = AdminAlcanceHelper.acotarAInstitucion(ctx, institucionId);
        const [dashboard, actividad] = await Promise.all([
            AdminRepository.getDashboard(alcance),
            AuditoriaRepository.getRecientes(alcance, 8)
        ]);

        return { ...dashboard, actividad_reciente: actividad };
    };
}

export default new AdminService();
