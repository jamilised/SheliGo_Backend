import PublicacionesRepository from '../repositories/publicaciones-repository.js';
import NotFoundError from '../errors/not-found-error.js';
import AppError from '../errors/app-error.js';
import { StorageHelper } from '../helpers/storage-helper.js';
import ArchivosRepository from '../repositories/archivos-repository.js';
import { DateHelper } from '../helpers/date-helper.js';
import { randomUUID } from 'node:crypto';

import PreguntasRepository
    from '../repositories/preguntas-repository.js';
import NotificacionesService
    from '../services/notificaciones-service.js';

class PublicacionesService {
    private archivosRepository = ArchivosRepository;
    private preguntasRepository = PreguntasRepository;
    private notificacionesService = NotificacionesService;

    repository = PublicacionesRepository;

    getDetalle = async (id: string) => {
        const publicacion = await this.repository.getById(id);
        if (!publicacion) {
            throw new NotFoundError('Publicación no encontrada');
        }
        publicacion.usuario_foto = StorageHelper.buildUrl(publicacion.usuario_foto);
        return publicacion;
    };

    // Publicaciones activas más recientes de las instituciones del usuario
    getRecentPublicaciones = async (usuarioId: string) => {
        const publicaciones = await this.repository.getRecent(usuarioId);
        if (publicaciones === null) {
            throw new AppError('Error al recuperar las publicaciones recientes', 500);
        }
        return publicaciones.map((pub: any) => {
            pub.foto_principal_url = StorageHelper.buildOptionalUrl(pub.foto_principal_url);
            return pub;
        });
    };

    searchPublicaciones = async (filtros: {
        busqueda?: string | undefined;
        categoria_id?: string[] | undefined;
        institucion_id?: string[] | undefined;
        lugar_institucion?: string | undefined;
        fecha_desde?: string | undefined;
        fecha_hasta?: string | undefined;
        tipo?: string | undefined;
        estado?: string | undefined;
    }) => {
        DateHelper.validarRangoFechas(filtros.fecha_desde, filtros.fecha_hasta);
        const publicaciones = await this.repository.search(filtros);

        if (publicaciones === null) {
            throw new AppError('Error al realizar la búsqueda de publicaciones', 500);
        }

        return publicaciones.map((pub: any) => {
            pub.foto_principal_url = StorageHelper.buildOptionalUrl(pub.foto_principal_url);
            return pub;
        });
    };

    createPublicacion = async (body: any, files: any, usuarioId: string) => {
        const publicacionId = randomUUID();
        const archivosSubidos: Array<{
            url: string;
            mime_type: string;
            es_principal: boolean;
        }> = [];
        const rutasIntentadas: string[] = [];

        try {
            for (let i = 0; i < (files?.length ?? 0); i++) {
                const archivo = files[i];
                const nombreArchivo = `${publicacionId}_${i}.jpg`;
                rutasIntentadas.push(`publicaciones/${nombreArchivo}`);

                const ruta = await StorageHelper.optimizarYSubir(
                    archivo.buffer,
                    'publicaciones',
                    nombreArchivo
                );
                if (!ruta) {
                    throw new AppError(
                        'No se pudo guardar una de las imágenes. La publicación no fue creada.',
                        502
                    );
                }

                archivosSubidos.push({
                    url: ruta,
                    mime_type: archivo.mimetype,
                    es_principal: i === 0
                });
            }

            const publicacion = await this.repository.createWithFiles(publicacionId, {
                nombre: body.nombre.trim(),
                descripcion: body.descripcion?.trim() || null,
                fecha_evento: body.fecha_evento,
                categoria_id: body.categoria_id,
                institucion_id: body.institucion_id || null,
                lugar_institucion: body.lugar_institucion || null,
                tipo: body.tipo,
                usuario_id: usuarioId,
                estado: 'activa'
            }, archivosSubidos);

            return publicacion;
        } catch (error) {
            try {
                await StorageHelper.eliminarObjetos(rutasIntentadas);
            } catch (cleanupError) {
                console.error('Falló la creación de la publicación y no se pudieron limpiar las imágenes.', {
                    error,
                    cleanupError
                });
                throw new AppError(
                    'No se pudo completar la publicación ni limpiar sus imágenes. Contacta con soporte.',
                    502
                );
            }

            throw error;
        }
    };

    // Soft delete: solo cambia el estado en BD
    remove = async (
        publicacionId: string,
        usuarioId: string
    ) => {

        const publicacion =
            await this.repository.getById(
                publicacionId
            );

        if (!publicacion) {
            throw new NotFoundError(
                "Publicación no encontrada"
            );
        }

        if (publicacion.usuario_id !== usuarioId) {
            throw new AppError(
                "No tienes permisos para eliminar esta publicación",
                403
            );
        }

        const usuarios =
            await this.preguntasRepository
                .getUsuariosPorPublicacion(
                    publicacionId,
                    publicacion.usuario_id
                ) ?? [];

        await this.repository.delete(
            publicacionId
        );

        for (const usuario of usuarios) {

            await this.notificacionesService
                .crearNotificacion({

                    usuario_id:
                        usuario.usuario_id,

                    publicacion_id:
                        publicacionId,

                    tipo:
                        "publicacion_eliminada",

                    titulo:
                        "Publicación eliminada",

                    contenido:
                        "Una publicación que te interesaba fue eliminada."

                });
        }
    };

    // Transición a estado 'recuperada'
    marcarComoRecuperada = async (publicacionId: string, usuarioId: string) => {
        const publicacion = await this.repository.getById(publicacionId);

        if (!publicacion) {
            throw new NotFoundError("Publicación no encontrada");
        }

        if (publicacion.usuario_id !== usuarioId) {
            throw new AppError("No tienes permisos para modificar esta publicación", 403);
        }

        if (publicacion.estado === 'recuperada') {
            throw new AppError("La publicación ya se encuentra marcada como recuperada", 400);
        }

        return await this.repository.updateEstado(publicacionId, 'recuperada');
    };

updatePublicacion = async (id: string, body: any, files: any, usuarioId: string) => {
        const publicacionOriginal = await this.repository.getById(id);
        if (!publicacionOriginal) {
            throw new NotFoundError('Publicación no encontrada.');
        }

        if (publicacionOriginal.usuario_id !== usuarioId) {
            throw new AppError('No tienes permisos para editar esta publicación.', 403);
        }

        const fotosEliminar: string[] = body.fotosAEliminar ?? [];
        const archivosSolicitados = fotosEliminar.length > 0
            ? await this.archivosRepository.getByIdsForPublication(
                fotosEliminar,
                id,
                usuarioId
            )
            : [];

        if (archivosSolicitados.length !== new Set(fotosEliminar).size) {
            throw new NotFoundError('Uno o más archivos no pertenecen a esta publicación.');
        }
        const archivosOriginales = await this.archivosRepository.getByPublicacionId(id) || [];
        const archivoPrincipalOriginal = archivosOriginales.find((archivo: any) => archivo.es_principal);

        const archivosNuevos: Array<{
            url: string;
            mime_type: string;
            es_principal: boolean;
        }> = [];
        const rutasNuevas: string[] = [];
        let rutasNuevasLimpiadas = false;
        let resultado: any = null;

        try {
            for (let i = 0; i < (files?.length ?? 0); i++) {
                const archivo = files[i];
                const nombreArchivo = `${id}_${randomUUID()}.jpg`;
                rutasNuevas.push(`publicaciones/${nombreArchivo}`);

                const ruta = await StorageHelper.optimizarYSubir(
                    archivo.buffer,
                    'publicaciones',
                    nombreArchivo
                );
                if (!ruta) {
                    throw new AppError(
                        'No se pudo guardar una de las imágenes. La actualización no fue aplicada.',
                        502
                    );
                }

                archivosNuevos.push({
                    url: ruta,
                    mime_type: archivo.mimetype,
                    es_principal: false
                });
            }

            resultado = await this.repository.updateWithFileChanges(
                id,
                usuarioId,
                {
                    nombre: body.nombre !== undefined ? body.nombre : publicacionOriginal.nombre,
                    descripcion: body.descripcion !== undefined ? body.descripcion : publicacionOriginal.descripcion,
                    fecha_evento: body.fecha_evento !== undefined ? body.fecha_evento : publicacionOriginal.fecha_evento,
                    categoria_id: body.categoria_id !== undefined ? body.categoria_id : publicacionOriginal.categoria_id,
                    institucion_id: body.institucion_id !== undefined ? body.institucion_id : publicacionOriginal.institucion_id,
                    lugar_institucion: body.lugar_institucion !== undefined ? body.lugar_institucion : publicacionOriginal.lugar_institucion,
                    tipo: body.tipo !== undefined ? body.tipo : publicacionOriginal.tipo,
                    estado: body.estado !== undefined ? body.estado : publicacionOriginal.estado
                },
                fotosEliminar,
                archivosNuevos
            );

            if (!resultado) {
                throw new AppError('La publicación cambió o dejó de estar disponible; vuelve a intentarlo.', 409);
            }

            if (resultado.archivosEliminados.length > 0) {
                try {
                    await StorageHelper.eliminarObjetos(
                        resultado.archivosEliminados.map((archivo: any) => archivo.url)
                    );
                } catch (storageError) {
                    try {
                        await this.repository.restoreAfterStorageFailure(
                            id,
                            {
                                categoria_id: publicacionOriginal.categoria_id,
                                institucion_id: publicacionOriginal.institucion_id,
                                nombre: publicacionOriginal.nombre,
                                descripcion: publicacionOriginal.descripcion,
                                fecha_evento: publicacionOriginal.fecha_evento,
                                tipo: publicacionOriginal.tipo,
                                estado: publicacionOriginal.estado,
                                lugar_institucion: publicacionOriginal.lugar_institucion
                            },
                            archivoPrincipalOriginal?.id ?? null,
                            resultado.archivosEliminados,
                            rutasNuevas
                        );
                        await StorageHelper.eliminarObjetos(rutasNuevas);
                        rutasNuevasLimpiadas = true;
                    } catch (compensationError) {
                        console.error(
                            `Falló la eliminación de imágenes de la publicación ${id} y también su compensación.`,
                            { storageError, compensationError }
                        );
                        throw new AppError(
                            'No se pudo completar la actualización ni revertir todos sus cambios. Contacta con soporte.',
                            500
                        );
                    }

                    console.error(
                        `No se pudieron eliminar imágenes de Storage para la publicación ${id}.`,
                        storageError
                    );
                    throw new AppError(
                        'No se pudieron eliminar las imágenes del almacenamiento. Los cambios de base de datos fueron revertidos.',
                        502
                    );
                }
            }
        } catch (error) {
            if (rutasNuevas.length > 0 && !rutasNuevasLimpiadas) {
                try {
                    await StorageHelper.eliminarObjetos(rutasNuevas);
                } catch (cleanupError) {
                    console.error(
                        `No se pudieron limpiar las imágenes nuevas de la publicación ${id}.`,
                        { error, cleanupError }
                    );
                    throw new AppError(
                        'No se pudo completar la actualización ni limpiar las imágenes nuevas. Contacta con soporte.',
                        502
                    );
                }
            }

            throw error;
        }

        const publicacionActualizada = resultado?.publicacion;
        const todosLosArchivos = await this.archivosRepository.getByPublicacionId(id) || [];
        const tienePrincipal = todosLosArchivos.some((a: any) => a.es_principal);

        if (!tienePrincipal && todosLosArchivos.length > 0) {
            await this.archivosRepository.marcarComoPrincipal(todosLosArchivos[0].id);
        }

        const huboCambiosEnFotos =
            (Array.isArray(fotosEliminar) && fotosEliminar.length > 0) ||
            (files && files.length > 0);

        const cambioContenido =
            publicacionOriginal.nombre !== publicacionActualizada?.nombre ||
            publicacionOriginal.descripcion !== publicacionActualizada?.descripcion ||
            publicacionOriginal.fecha_evento?.toString() !== publicacionActualizada?.fecha_evento?.toString() ||
            publicacionOriginal.categoria_id !== publicacionActualizada?.categoria_id ||
            publicacionOriginal.institucion_id !== publicacionActualizada?.institucion_id ||
            publicacionOriginal.lugar_institucion !== publicacionActualizada?.lugar_institucion ||
            publicacionOriginal.tipo !== publicacionActualizada?.tipo ||
            publicacionOriginal.estado !== publicacionActualizada?.estado;

        if (cambioContenido || huboCambiosEnFotos) {
            const usuarios =
                await this.preguntasRepository
                    .getUsuariosPorPublicacion(
                        id,
                        publicacionOriginal.usuario_id
                    ) ?? [];

            for (const usuario of usuarios) {
                await this.notificacionesService
                    .crearNotificacion({
                        usuario_id: usuario.usuario_id,
                        publicacion_id: id,
                        tipo: "publicacion_editada",
                        titulo: "Publicación editada",
                        contenido: "Una publicación que te interesa fue modificada."
                    });
            }
        }

        return {
            ...publicacionActualizada,
            fotos: todosLosArchivos
        };
    };

    getMisPublicaciones = async (usuarioId: string) => {
        const publicaciones = await this.repository.getByUsuarioId(usuarioId);

        if (!publicaciones) {
            throw new AppError("Error al recuperar las publicaciones.", 500);
        }

        return publicaciones.map((pub: any) => {
            pub.foto_principal_url = StorageHelper.buildOptionalUrl(pub.foto_principal_url);
            return pub;
        });
    };
}

export default new PublicacionesService();