import { randomBytes, randomUUID } from 'node:crypto';
import dbPg from '../database/db-pg.js';
import AdminInstitucionesRepository from '../repositories/admin-instituciones-repository.js';
import type { InstitucionDatos } from '../repositories/admin-instituciones-repository.js';
import AuditoriaRepository from '../repositories/auditoria-repository.js';
import { PaginationHelper } from '../helpers/pagination-helper.js';
import { StorageHelper } from '../helpers/storage-helper.js';
import AppError from '../errors/app-error.js';
import type { AdminContext } from '../types/admin-types.js';
import type {
    AdminCrearInstitucion,
    AdminEditarInstitucion,
    AdminListaQuery
} from '../validations/admin-schema.js';

const CARPETA_FOTOS = 'instituciones';

const conFoto = <T extends { foto?: string | null }>(institucion: T): T => ({
    ...institucion,
    foto: StorageHelper.buildOptionalUrl(institucion.foto)
});

/*
Cada foto nueva usa un nombre distinto: así la CDN de Supabase no sirve la
versión anterior en caché después de reemplazarla.
*/
const subirFoto = async (archivo: Express.Multer.File, institucionId: string): Promise<string> => {
    const path = await StorageHelper.optimizarYSubir(
        archivo.buffer,
        CARPETA_FOTOS,
        `${institucionId}-${randomBytes(6).toString('hex')}.jpg`,
        { width: 800, height: 800, fit: 'inside' }
    );
    if (!path) {
        throw new AppError('No se pudo guardar la imagen de la institución.', 502);
    }
    return path;
};

// Borrado "best effort": si falla, queda un archivo huérfano pero el dato ya es consistente
const borrarFoto = async (path: string | null | undefined) => {
    if (!path || /^https?:\/\//i.test(path) || !path.startsWith(`${CARPETA_FOTOS}/`)) return;
    try {
        await StorageHelper.eliminarObjeto(path);
    } catch (error) {
        console.error(`No se pudo borrar la foto de institución ${path}.`, error);
    }
};

// Postgres 23503: alguna FK con RESTRICT impidió el borrado (carrera con un alta concurrente)
const esViolacionFk = (error: unknown) => (error as { code?: unknown })?.code === '23503';

class AdminInstitucionesService {
    listar = async (ctx: AdminContext, filtros: AdminListaQuery) => {
        const { items, total } = await AdminInstitucionesRepository.listar(ctx, filtros);
        return PaginationHelper.build(items.map(conFoto), total, filtros.page, filtros.limit);
    };

    getDetalle = async (ctx: AdminContext, id: string) => {
        const institucion = await AdminInstitucionesRepository.getDetalle(ctx, id);
        if (!institucion) {
            throw new AppError('Institución no encontrada', 404);
        }
        return conFoto(institucion);
    };

    // Solo admin general (requireGlobalAdmin en la ruta)
    crear = async (ctx: AdminContext, body: AdminCrearInstitucion, archivo?: Express.Multer.File) => {
        // instituciones.foto es NOT NULL: el logo o foto es obligatorio en el alta
        if (!archivo) {
            throw new AppError('El logo o foto de la institución es obligatorio.', 400);
        }

        const id = randomUUID();
        const foto = await subirFoto(archivo, id);

        const datos: InstitucionDatos = {
            nombre: body.nombre,
            email: body.email ?? null,
            direccion: body.direccion,
            telefono: body.telefono ?? null,
            latitud: body.latitud ?? null,
            longitud: body.longitud ?? null,
            foto
        };

        try {
            await dbPg.transaction(async (client) => {
                await AdminInstitucionesRepository.crear(client, id, datos);
                await AuditoriaRepository.registrar(client, {
                    adminId: ctx.id,
                    accion: 'institucion.crear',
                    entidad: 'institucion',
                    entidadId: id,
                    institucionId: id,
                    detalle: { nombre: datos.nombre }
                });
            });
        } catch (error) {
            await borrarFoto(foto);
            throw error;
        }

        return this.getDetalle(ctx, id);
    };

    // Admin general o administrador institucional de esa institución
    editar = async (
        ctx: AdminContext,
        id: string,
        body: AdminEditarInstitucion,
        archivo?: Express.Multer.File
    ) => {
        if (!ctx.esGlobal && !ctx.institucionesIds.includes(id)) {
            throw new AppError('Institución no encontrada', 404);
        }

        const campos = body;
        const hayCambiosDeDatos = Object.values(campos).some((valor) => valor !== undefined);
        if (!hayCambiosDeDatos && !archivo) {
            throw new AppError('No se enviaron cambios', 400);
        }

        const fotoNueva = archivo ? await subirFoto(archivo, id) : null;
        let fotoAnterior: string | null = null;

        try {
            await dbPg.transaction(async (client) => {
                const actual = await AdminInstitucionesRepository.bloquear(client, id);
                if (!actual) {
                    throw new AppError('Institución no encontrada', 404);
                }

                // Los campos no enviados conservan su valor; '' ya llegó convertido a null
                const datos: InstitucionDatos = {
                    nombre: campos.nombre ?? actual.nombre,
                    email: campos.email !== undefined ? campos.email : actual.email,
                    direccion: campos.direccion ?? actual.direccion,
                    telefono: campos.telefono !== undefined ? campos.telefono : actual.telefono,
                    latitud: campos.latitud !== undefined ? campos.latitud : actual.latitud,
                    longitud: campos.longitud !== undefined ? campos.longitud : actual.longitud,
                    foto: fotoNueva ?? actual.foto
                };

                const cambios = (Object.keys(datos) as Array<keyof InstitucionDatos>)
                    .filter((campo) => datos[campo] !== actual[campo]);
                if (cambios.length === 0) return;

                await AdminInstitucionesRepository.actualizar(client, id, datos);
                await AuditoriaRepository.registrar(client, {
                    adminId: ctx.id,
                    accion: 'institucion.editar',
                    entidad: 'institucion',
                    entidadId: id,
                    institucionId: id,
                    detalle: { nombre: datos.nombre, campos: cambios }
                });

                if (datos.foto !== actual.foto) {
                    fotoAnterior = actual.foto;
                }
            });
        } catch (error) {
            await borrarFoto(fotoNueva);
            throw error;
        }

        // Recién con la transacción confirmada se borra la foto reemplazada
        await borrarFoto(fotoAnterior);

        return this.getDetalle(ctx, id);
    };

    /*
    Solo admin general. Se bloquea si la institución tiene publicaciones
    (FK RESTRICT) o miembros (se borrarían en cascada sus membresías).
    */
    eliminar = async (ctx: AdminContext, id: string) => {
        let fotoBorrada: string | null = null;

        try {
            await dbPg.transaction(async (client) => {
                const actual = await AdminInstitucionesRepository.bloquear(client, id);
                if (!actual) {
                    throw new AppError('Institución no encontrada', 404);
                }

                const { publicaciones, miembros } = await AdminInstitucionesRepository.contarDependencias(client, id);
                if (publicaciones > 0 || miembros > 0) {
                    throw new AppError(
                        `No se puede eliminar: tiene ${publicaciones} publicación(es) y ${miembros} miembro(s) asociados.`,
                        409
                    );
                }

                await AdminInstitucionesRepository.eliminar(client, id);
                // institucion_id queda en null: la institución ya no existe, el id se conserva en entidad_id
                await AuditoriaRepository.registrar(client, {
                    adminId: ctx.id,
                    accion: 'institucion.eliminar',
                    entidad: 'institucion',
                    entidadId: id,
                    institucionId: null,
                    detalle: { nombre: actual.nombre, email: actual.email, direccion: actual.direccion }
                });

                fotoBorrada = actual.foto;
            });
        } catch (error) {
            if (esViolacionFk(error)) {
                throw new AppError('No se puede eliminar: la institución tiene registros asociados.', 409);
            }
            throw error;
        }

        await borrarFoto(fotoBorrada);
    };
}

export default new AdminInstitucionesService();
