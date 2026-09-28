import PublicacionesRepository from '../repositories/publicaciones-repository.js';
import NotFoundError from '../errors/not-found-error.js';
import AppError from '../errors/app-error.js';
import { StorageHelper } from '../helpers/storage-helper.js';
import ArchivosRepository from '../repositories/archivos-repository.js';
import { DateHelper } from '../helpers/date-helper.js';

class PublicacionesService {
    private archivosRepository = ArchivosRepository;
    repository = PublicacionesRepository;

    getDetalle = async (id: string) => {
        const publicacion = await this.repository.getById(id);
        if (!publicacion) {
            throw new NotFoundError('Publicación no encontrada');
        }
        publicacion.usuario_foto = StorageHelper.buildUrl(publicacion.usuario_foto);
        return publicacion;
    };

    getRecentPublicaciones = async () => {
        const publicaciones = await this.repository.getRecent();
        if (publicaciones === null) {
            throw new AppError('Error al recuperar las publicaciones recientes', 500);
        }
        return publicaciones.map((pub: any) => {
            pub.foto_principal_url = StorageHelper.buildUrl(pub.foto_principal_url);
            return pub;
        });
    };

    searchPublicaciones = async (filtros: {
        busqueda?: string;
        categoria_id?: string;
        institucion_id?: string;
        lugar_institucion?: string;
        fecha_desde?: string;
        fecha_hasta?: string;
        tipo?: string;
        estado?: string;
    }) => {
        DateHelper.validarRangoFechas(filtros.fecha_desde, filtros.fecha_hasta);
        const publicaciones = await this.repository.search(filtros);

        if (publicaciones === null) {
            throw new AppError('Error al realizar la búsqueda de publicaciones', 500);
        }

        return publicaciones.map((pub: any) => {
            pub.foto_principal_url = StorageHelper.buildUrl(pub.foto_principal_url);
            return pub;
        });
    };

    createPublicacion = async (body: any, files: any, usuarioId: string) => {
        const publicacion = await this.repository.create({
            nombre: body.nombre.trim(),
            descripcion: body.descripcion?.trim() || null,
            fecha_evento: body.fecha_evento,
            categoria_id: body.categoria_id,
            institucion_id: body.institucion_id || null,
            lugar_institucion: body.lugar_institucion || null,
            tipo: body.tipo,
            usuario_id: usuarioId,
            estado: 'activa'
        });

        if (!publicacion) {
            throw new AppError('No se pudo crear la publicación', 500);
        }

        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const archivo = files[i];
                const ruta = await StorageHelper.optimizarYSubir(
                    archivo.buffer,
                    'publicaciones',
                    `${publicacion.id}_${i}.jpg`
                );

                if (!ruta) continue;

                await this.archivosRepository.create({
                    publicacion_id: publicacion.id,
                    url: ruta,
                    mime_type: archivo.mimetype,
                    es_principal: i === 0
                });
            }
        }

        return publicacion;
    };

    // Soft delete: solo cambia el estado en BD
    remove = async (publicacionId: string, usuarioId: string) => {
        const publicacion = await this.repository.getById(publicacionId);

        if (!publicacion) {
            throw new NotFoundError("Publicación no encontrada");
        }

        if (publicacion.usuario_id !== usuarioId) {
            throw new AppError("No tienes permisos para eliminar esta publicación", 403);
        }

        await this.repository.delete(publicacionId);
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

        const publicacionActualizada = await this.repository.update(id, {
            nombre: body.nombre !== undefined ? body.nombre : publicacionOriginal.nombre,
            descripcion: body.descripcion !== undefined ? body.descripcion : publicacionOriginal.descripcion,
            fecha_evento: body.fecha_evento !== undefined ? body.fecha_evento : publicacionOriginal.fecha_evento,
            categoria_id: body.categoria_id !== undefined ? body.categoria_id : publicacionOriginal.categoria_id,
            institucion_id: body.institucion_id !== undefined ? body.institucion_id : publicacionOriginal.institucion_id,
            lugar_institucion: body.lugar_institucion !== undefined ? body.lugar_institucion : publicacionOriginal.lugar_institucion,
            tipo: body.tipo !== undefined ? body.tipo : publicacionOriginal.tipo,
            estado: body.estado !== undefined ? body.estado : publicacionOriginal.estado
        });

        if (!publicacionActualizada) {
            throw new AppError('No se pudo actualizar la publicación.', 500);
        }

        let fotosEliminar = body.fotosAEliminar;
        if (fotosEliminar) {
            if (typeof fotosEliminar === 'string') {
                try { fotosEliminar = JSON.parse(fotosEliminar); }
                catch { fotosEliminar = [fotosEliminar]; }
            }

            if (Array.isArray(fotosEliminar) && fotosEliminar.length > 0) {
                for (const fotoId of fotosEliminar) {
                    await this.archivosRepository.deleteById(fotoId);
                }
            }
        }

        if (files && files.length > 0) {
            const archivosExistentes = await this.archivosRepository.getByPublicacionId(id) || [];
            let indexInicio = archivosExistentes.length;

            for (let i = 0; i < files.length; i++) {
                const archivo = files[i];
                const nombreArchivo = `${id}_${Date.now()}_${indexInicio + i}.jpg`;

                const ruta = await StorageHelper.optimizarYSubir(
                    archivo.buffer,
                    'publicaciones',
                    nombreArchivo
                );

                if (!ruta) continue;

                await this.archivosRepository.create({
                    publicacion_id: id,
                    url: ruta,
                    mime_type: archivo.mimetype,
                    es_principal: false
                });
            }
        }

        const todosLosArchivos = await this.archivosRepository.getByPublicacionId(id) || [];
        const tienePrincipal = todosLosArchivos.some((a: any) => a.es_principal);

        if (!tienePrincipal && todosLosArchivos.length > 0) {
            await this.archivosRepository.marcarComoPrincipal(todosLosArchivos[0].id);
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
            pub.foto_principal_url = StorageHelper.buildUrl(pub.foto_principal_url);
            return pub;
        });
    };
}

export default new PublicacionesService();