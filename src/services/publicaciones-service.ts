import PublicacionesRepository from '../repositories/publicaciones-repository.js'
import NotFoundError from '../errors/not-found-error.js'
import AppError from '../errors/app-error.js';
import { StorageHelper } from '../helpers/storage-helper.js';
import ArchivosRepository from '../repositories/archivos-repository.js';

class PublicacionesService {

    private archivosRepository = ArchivosRepository;
    repository = PublicacionesRepository;

    getDetalle = async (id: string) => {

        const publicacion =
            await this.repository.getById(id)

        if (!publicacion) {
            throw new NotFoundError(
                'Publicación no encontrada'
            )
        }

        publicacion.usuario_foto =
            StorageHelper.buildUrl(
                publicacion.usuario_foto
            )

        return publicacion

    }

    getRecentPublicaciones = async () => {
        const publicaciones = await this.repository.getRecent();

        if (publicaciones === null) {
            throw new AppError('Error al recuperar las publicaciones recientes', 500);
        }

        // Mapeamos el array para transformar la URL de cada publicación
        const publicacionesConUrlCompleta = publicaciones.map((pub: any) => {
            pub.foto_principal_url = StorageHelper.buildUrl(pub.foto_principal_url);
            return pub;
        })

        return publicacionesConUrlCompleta;
    };


    searchPublicaciones = async (filtros: {
        busqueda?: string;
        categoria_id?: string;
        institucion_id?: string;
        lugar_institucion?: string;
        fecha_desde?: string;
        fecha_hasta?: string;
        tipo?: string;
    }) => {
        console.log('S1: Entrando a searchPublicaciones en el Service');

        if (
            filtros.fecha_desde &&
            filtros.fecha_hasta &&
            new Date(filtros.fecha_desde) > new Date(filtros.fecha_hasta)
        ) {
            throw new AppError(
                'La fecha desde no puede ser posterior a la fecha hasta.',
                400
            );
        }


        // 1. Llamamos al repositorio usando "this.repository"
        const publicaciones = await this.repository.search(filtros);

        if (publicaciones === null) {
            throw new AppError('Error al realizar la búsqueda de publicaciones', 500);
        }

        // 2. Mapeamos para meterle la URL completa de la foto (igual que hacés en getRecent)
        const publicacionesConUrlCompleta = publicaciones.map((pub: any) => {
            pub.foto_principal_url = StorageHelper.buildUrl(pub.foto_principal_url);
            return pub;
        });

        return publicacionesConUrlCompleta;
    }

    createPublicacion = async (
        body: any,
        files: any,
        usuarioId: string
    ) => {

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
            throw new AppError(
                'No se pudo crear la publicación',
                500
            );
        }

        if (files && files.length > 0) {

            for (let i = 0; i < files.length; i++) {

                const archivo = files[i];

                const ruta = await StorageHelper.optimizarYSubir(
                    archivo.buffer,
                    'publicaciones',
                    `${publicacion.id}_${i}.jpg`
                );

                if (!ruta) {
                    continue;
                }

                await this.archivosRepository.create({
                    publicacion_id: publicacion.id,
                    url: ruta,
                    mime_type: archivo.mimetype,
                    es_principal: i === 0
                });

            }

        }

        return publicacion;
    }

    remove = async (
        publicacionId: string,
        usuarioId: string
    ) => {

        const publicacion =
            await this.repository.getById(publicacionId);

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

        const archivos =
            await this.archivosRepository.getByPublicacionId(publicacionId) || [];

        for (const archivo of archivos) {

            // luego implementaremos borrar de Supabase
            // StorageHelper.delete(archivo.url)

        }

        await this.repository.delete(publicacionId);

    }
}

export default new PublicacionesService()