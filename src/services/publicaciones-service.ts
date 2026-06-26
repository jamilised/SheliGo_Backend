import PublicacionesRepository from '../repositories/publicaciones-repository.js'
import NotFoundError from '../errors/not-found-error.js'
import AppError from '../errors/app-error.js';
import { StorageHelper } from '../helpers/storage-helper.js';

class PublicacionesService {

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
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo?: string;
}) => {
    console.log('S1: Entrando a searchPublicaciones en el Service');
    
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
}

export default new PublicacionesService()